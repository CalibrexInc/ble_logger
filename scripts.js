import RDA from './RDA.js'

let bluetoothDevice = null;
let isConnected = false;
let isRecording = false;
let maxAccel = 40000;
let maxGyro = 40000;
let sensorData = [];
const maxDataPoints = 300;
const minInterval = 50000;
var lastTS = 0;
var reps = 0;

const rda = new RDA();

// Initialize chart data
const data = {
    labels: [], // Timestamps
    datasets: [
        {
            label: 'Acc',
            borderColor: 'rgb(255, 99, 132)',
            data: []
        },
        {
            label: 'Velo',
            borderColor: 'rgb(54, 162, 235)',
            data: []
        },
        {
            label: 'Dist',
            borderColor: 'rgb(75, 192, 192)',
            data: []
        }
    ]
};



const config = {
    type: 'line',
    data: data,
    options: {
        spanGaps: true, 
        animation: false,  // Disable animations for performance
        scales: {
            x: {
                type: 'linear',
                position: 'bottom'
            },
            y: {
                min: -maxAccel,
                max: maxAccel
            }
        }
    }
};




// Create the chart
const ctx = document.getElementById('accelChart').getContext('2d');
//const ctx2 = document.getElementById('gyroChart').getContext('2d');
const accelChart = new Chart(ctx, config);
//const gyroChart = new Chart(ctx2, config2);



function addData(ax, ay, az, gx, gy, gz, timestamp) {
    if(isRecording){
        updateData(ax, ay, az, gx, gy, gz, timestamp);
        console.log('Vector: ' + ax);
    }
    if(timestamp - lastTS > minInterval){
        // Add new data points to the chart
        accelChart.data.labels.push(timestamp);

        accelChart.data.datasets[0].data.push(ax);
        accelChart.data.datasets[1].data.push(ay);
        accelChart.data.datasets[2].data.push(az);


        // Check if the number of data points exceeds the maximum allowed
        if (accelChart.data.labels.length > maxDataPoints) {
            // Remove the oldest data point
            accelChart.data.labels.shift();
            // gyroChart.data.labels.shift();
            accelChart.data.datasets.forEach((dataset) => {
                dataset.data.shift();
            });
        }

        // Update the chart to reflect the new data points
        accelChart.update();
        lastTS = timestamp;
    }
}

function clearChartData() {
    // Check if the chart has been initialized
    if (accelChart) {
        // Clear data arrays for each dataset
        //accelChart.data.labels = []; // Clear the axis labels
        accelChart.data.datasets.forEach((dataset) => {
            dataset.data = []; // Clear the data points
        });
        
        // Update the chart to reflect the changes
        accelChart.update();        
    }
    // if (gyroChart) {
    //     // Clear data arrays for each dataset
    //     //gyroChart.data.labels = []; // Clear the axis labels
    //     gyroChart.data.datasets.forEach((dataset) => {
    //         dataset.data = []; // Clear the data points
    //     });
        
    //     // Update the chart to reflect the changes
    //     gyroChart.update();        
    // }
    
}

document.getElementById('record-btn').addEventListener('click', startRecording);

document.getElementById('connect-btn').addEventListener('click', function() {
    if(!isConnected){        
        if (!navigator.bluetooth) {
            console.error('Web Bluetooth is not available in this browser!');
            return;
        }

        console.log('Requesting Bluetooth Device...');
        navigator.bluetooth.requestDevice({
            filters: [{
                name: 'Calibrex V2.0'
            }],
            optionalServices: ['0000aaaa-ead2-11e7-80c1-9a214cf093ae']
        })
        .then(device => {
            bluetoothDevice = device;
            bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
            return device.gatt.connect();
        })
        .then(server => {
            isConnected = true;
            updateButtonForDisconnect();
            clearChartData();
            return server.getPrimaryService('0000aaaa-ead2-11e7-80c1-9a214cf093ae');
        })
        .then(service => {
            return Promise.all([
                service.getCharacteristic('00006666-ead3-11e7-80c1-9a214cf093ae'),
                service.getCharacteristic('00001111-ead4-11e7-80c1-9a214cf093ae')
            ]);
        })
        .then(characteristics => {

            const imu_char = characteristics[0];
            const btn_char = characteristics[1];
            imu_char.addEventListener('characteristicvaluechanged', (event) => {
                const value = event.target.value;
                // Convert the Uint8Array to a string of hex numbers separated by commas
                let lastValue = Array.from(new Uint8Array(value.buffer))
                                .map(byte => byte.toString(16).padStart(2, '0'))
                                .join(', ');
                const data = parseBLEPacket(lastValue);       
                let output = rda.countReps(data);
                addData(output.diffCount * 100,output.velocity,output.diff,data.gx,data.gy,data.gz,data.timestamp);
                if(reps != rda.getReps()){
                    reps = rda.getReps();
                    setReps('reps', reps);
                }
            });

            btn_char.addEventListener('characteristicvaluechanged', (event) => {
                // Set reps to 0 when the value is changed for characteristic2
                rda.clearReps();
                console.log('Reps set to 0');
            });

            return Promise.all([
                imu_char.startNotifications(),
                btn_char.startNotifications()
            ]);
        })
        .then(() => {
            console.log('Notifications have been started.');
        })
        .catch(error => {
            console.error('Bluetooth Device handling failed:', error);
        });
    }else {
        if (bluetoothDevice) {
            bluetoothDevice.gatt.disconnect();
            console.log('Device disconnected by user');
            onDisconnected();
        }
    }
});

function startRecording(){
    const recButton = document.getElementById('record-btn');
    if(!isRecording){        
        recButton.classList.add('stop');
        clearData();
        isRecording = true;
    }else{
        recButton.classList.remove('stop');
        isRecording = false;
        downloadCSV(sensorData);
    }
}

function updateButtonForDisconnect() {
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.textContent = 'Disconnect';
    connectBtn.classList.add('disconnect');    
}

function onDisconnected() {
    isConnected = false;
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.textContent = 'Connect';
    connectBtn.classList.remove('disconnect');
    clearData();    
    console.log('Device disconnected');    
}

// Add the listener for auto disconnection
function addDisconnectedListener(device) {
    device.addEventListener('gattserverdisconnected', onDisconnected);
}


function parseBLEPacket(packet) {
    // Split the packet string into an array of hex numbers
    const bytes = packet.split(', ').map(hex => parseInt(hex, 16));

    // Function to combine two bytes into one 16-bit signed integer (little-endian)
    function combineBytes(low, high) {
        const combined = (high << 8) | low;
        // Convert to 16-bit signed two's complement
        return combined >= 0x8000 ? combined - 0x10000 : combined;
    }

    // Function to combine four bytes into one 32-bit unsigned integer (little-endian)
    function combineFourBytes(b1, b2, b3, b4) {
        return ((b4 << 24) >>> 0) | (b3 << 16) | (b2 << 8) | b1;
    }

    // Parsing the variables from the packet
    const ax = combineBytes(bytes[0], bytes[1]);
    const ay = combineBytes(bytes[2], bytes[3]);
    const az = combineBytes(bytes[4], bytes[5]);
    const gx = combineBytes(bytes[6], bytes[7]);
    const gy = combineBytes(bytes[8], bytes[9]);
    const gz = combineBytes(bytes[10], bytes[11]);
    const timestamp = combineFourBytes(bytes[12], bytes[13], bytes[14], bytes[15]);

    // Return an object with all the parsed values
    return { ax, ay, az, gx, gy, gz, timestamp };
}

function updateData(ax, ay, az, gx, gy, gz, timestamp) {
    const dataPoint = {
        ax: ax,
        ay: ay,
        az: az,
        gx: gx,
        gy: gy,
        gz: gz,
        timestamp: timestamp
    };
    sensorData.push(dataPoint);
}

function clearData() {
    sensorData = [];  // Clears the array by reinitializing it
    lastTS = 0;
}



function downloadCSV(sensorData) {
    if(sensorData.length < 1000){
        return;
    }
    // Prompt the user for a filename
    const inputReps = prompt("Number of Reps", "X");
    const filename = prompt("Exercise Name:", "sensor_data");
    if (!filename) {
        // If the user clicks "Cancel" or enters an empty string, abort the download
        return;
    }

    const csvName = inputReps + '_' + filename + '.csv';

    // Column headers for the CSV file
    const headers = ['ax', 'ay', 'az', 'gx', 'gy', 'gz', 'timestamp'];

    // Convert array of objects into a CSV string
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    // Loop through the data to format each row and add to csvRows array
    for (const data of sensorData) {
        csvRows.push([
            data.ax,
            data.ay,
            data.az,
            data.gx,
            data.gy,
            data.gz,
            data.timestamp
        ].join(','));
    }

    // Join all rows into a single CSV string
    const csvString = csvRows.join('\n');

    // Create a Blob with the CSV data
    const blob = new Blob([csvString], { type: 'text/csv' });
    const uploaded = false;//uploadFile(blob, csvName);

    if(!uploaded){
        // Create an invisible anchor element to trigger the download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', csvName);
        link.style.visibility = 'hidden';

        // Append the link to the document and trigger the download
        document.body.appendChild(link);
        link.click();

        // Clean up: remove the link and revoke the URL
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

function setReps(id, value) {
    var element = document.getElementById(id);
    if (element && element.tagName.toLowerCase() === 'h1') {
        element.textContent = value;
    } else {
        console.error("Element with ID '" + id + "' is either not found or not an <h1> element.");
    }
}










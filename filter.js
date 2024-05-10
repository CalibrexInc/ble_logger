class LowPassFilter {
    constructor(sampleRate, cutoffFrequency) {
        this.sampleRate = sampleRate;
        this.cutoffFrequency = cutoffFrequency;
        
        // Calculate coefficients for a Butterworth low-pass filter
        this.calculateCoefficients();
        
        // Initialize filter memory
        this.reset();
    }

    // Calculate filter coefficients
    calculateCoefficients() {
        // Calculate normalized cutoff frequency
        const nyquist = this.sampleRate / 2;
        const normalizedCutoff = this.cutoffFrequency / nyquist;

        // Calculate filter order (4th order for smoother response)
        const filterOrder = 4;

        // Calculate poles of the Butterworth filter
        this.poles = [];
        for (let i = 0; i < filterOrder; i++) {
            const theta = Math.PI * (2 * i + 1) / (2 * filterOrder);
            const real = -Math.sin(theta) * Math.sinh(Math.log(2) / 2);
            const imag = Math.cos(theta) * Math.cosh(Math.log(2) / 2);
            this.poles.push({ real, imag });
        }

        // Normalize poles to the desired cutoff frequency
        this.poles = this.poles.map(pole => ({
            real: pole.real * normalizedCutoff,
            imag: pole.imag * normalizedCutoff
        }));
    }

    // Reset filter memory
    reset() {
        this.prevInput = 0;
        this.prevOutput = 0;
        this.prevPrevOutput = 0;
    }

    // Filter a single input sample
    filter(input) {
        // Apply filter difference equation
        const b0 = 1; // Filter coefficients are all 1 for a Butterworth filter
        const b1 = 1;
        const b2 = 1;
        const a1 = -2 * this.poles[0].real;
        const a2 = Math.pow(this.poles[0].real, 2) - Math.pow(this.poles[0].imag, 2);

        const output = b0 * input + b1 * this.prevInput + b2 * this.prevPrevInput -
                       a1 * this.prevOutput - a2 * this.prevPrevOutput;

        // Update filter memory
        this.prevPrevInput = this.prevInput;
        this.prevInput = input;
        this.prevPrevOutput = this.prevOutput;
        this.prevOutput = output;

        return output;
    }
}

export default LowPassFilter;
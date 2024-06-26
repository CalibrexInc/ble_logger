class RDA{
    
    constructor(){
        this.reset()    
    }

    countReps(row){

        let vector = Math.sqrt(row.ax * row.ax + row.ay * row.ay +  row.az * row.az);
        this.vectorLast = this.vectorLast == 0 ? vector : this.vectorLast;
        let delta = vector > 0 ? vector - this.vectorLast : 0;
        this.vectorLast = vector;
        this.total = this.total + delta;
        this.buffer.push(this.total);
        if(this.buffer.length > 33){
            this.buffer.shift();
        }
        let smooth = this.buffer.reduce((acc, val) => acc + val, 0)/this.buffer.length;
        smooth = Math.abs(smooth) < 400 ? 0 : smooth;
        //max = Math.abs(max) < 2000 ? max*.5 : max;
        this.velocity = (this.velocity + smooth/20)*.97;
        this.max = this.velocity > this.max ? this.velocity : this.max;
        this.min = this.velocity > this.max ? this.velocity : this.min;
        this.min = this.velocity < this.min ? this.velocity : this.min;
        this.diff = this.max - this.min;
        this.diff = this.diff < this.threshold ? 0 : this.diff;
        this.testy = ( (this.testy + 1/4 * vector * vector/50000)+this.testy)*.35;
        
        
        this.diffLast = this.diff;
        if(this.min < 0 && this.velocity > 0){    
            this.reps = this.diff > this.threshold ? this.reps + 1 : this.reps;
            this.min = 0;
            this.max = 0;
        }
        return {vector: smooth, velocity: this.velocity, diff: this.diff, reps: this.reps, diffCount: this.diffCount * this.diff/2000, testy: this.testy};
    }
    getReps(){
        return this.reps;
    }

    reset(){
        this.reps = 0;
        this.diff = 0; 
        this.diffLast = 0;
        this.total = 0;
        this.vectorLast = 0;
        this.velocity = 0;
        this.max = 0; 
        this.min = 0;
        this.threshold = 3000;
        this.buffer = [];
        this.diffCount = 0;
        this.zeroCount = 0;
        this.testy = 0;
    }

    clearReps(){
        this.reps=0;
    }
}

export default RDA;
// High-performance Canvas Sparkline & Rolling History Chart
class HistoryChart {
    constructor(canvasId, maxPoints = 60) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maxPoints = maxPoints;

        this.cpuData = new Array(maxPoints).fill(0);
        this.gpuData = new Array(maxPoints).fill(0);
        this.gpuTempData = new Array(maxPoints).fill(0);

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.draw();
    }

    push(cpu, gpu, gpuTemp) {
        this.cpuData.push(Math.min(100, Math.max(0, cpu || 0)));
        this.cpuData.shift();

        this.gpuData.push(Math.min(100, Math.max(0, gpu || 0)));
        this.gpuData.shift();

        this.gpuTempData.push(Math.min(100, Math.max(0, gpuTemp || 0)));
        this.gpuTempData.shift();

        this.draw();
    }

    draw() {
        if (!this.ctx || !this.width || !this.height) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        const padLeft = 32;
        const padRight = 10;
        const padTop = 10;
        const padBottom = 20;

        const graphW = w - padLeft - padRight;
        const graphH = h - padTop - padBottom;

        // Draw horizontal grid lines & labels
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Consolas, monospace';
        ctx.textAlign = 'right';

        const gridSteps = [0, 25, 50, 75, 100];
        for (const pct of gridSteps) {
            const y = padTop + graphH - (pct / 100) * graphH;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();

            ctx.fillText(pct + '%', padLeft - 6, y + 3);
        }

        const stepX = graphW / (this.maxPoints - 1);

        // Helper to plot a series
        const plotSeries = (data, strokeColor, fillColor) => {
            if (!data || data.length === 0) return;

            ctx.beginPath();
            for (let i = 0; i < data.length; i++) {
                const x = padLeft + i * stepX;
                const y = padTop + graphH - (data[i] / 100) * graphH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            // Fill area under curve
            if (fillColor) {
                ctx.save();
                ctx.lineTo(padLeft + (data.length - 1) * stepX, padTop + graphH);
                ctx.lineTo(padLeft, padTop + graphH);
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.restore();
            }

            // Stroke line
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        // 1. GPU Temp (dotted amber)
        ctx.save();
        ctx.setLineDash([4, 4]);
        plotSeries(this.gpuTempData, '#f59e0b', null);
        ctx.restore();

        // 2. GPU Load (Green gradient)
        const gpuGrad = ctx.createLinearGradient(0, padTop, 0, padTop + graphH);
        gpuGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gpuGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
        plotSeries(this.gpuData, '#10b981', gpuGrad);

        // 3. CPU Load (Cyan gradient)
        const cpuGrad = ctx.createLinearGradient(0, padTop, 0, padTop + graphH);
        cpuGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
        cpuGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
        plotSeries(this.cpuData, '#00f0ff', cpuGrad);
    }
}

window.HistoryChart = HistoryChart;

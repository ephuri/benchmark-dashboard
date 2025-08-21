// --- ⬇️⬇️⬇️【请在这里配置你想默认显示的CKPT名称】⬇️⬇️⬇️ ---
const DEFAULT_CKPTS = ['ckpt-14400', 'ckpt-16000', 'LLaVA-OneVision-7B', '0808-1-3-1000', '0808-1-3-1200', 'Qwen2.5-VL-7B']; 
// --- ⬆️⬆️⬆️【配置结束】⬆️⬆️⬆️ ---

// 全局变量
let barChart, radarChart;
let allData = {};

document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    fetchDataAndRender();
});

function initCharts() {
    barChart = echarts.init(document.getElementById('bar-chart'));
    radarChart = echarts.init(document.getElementById('radar-chart'));
    
    // 显示加载动画
    barChart.showLoading();
    radarChart.showLoading();
}

async function fetchDataAndRender() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allData = await response.json();
        if (allData.error) {
            throw new Error(allData.error);
        }

        barChart.hideLoading();
        radarChart.hideLoading();

        createCheckboxes();
        updateCharts();

    } catch (error) {
        console.error('获取或处理数据失败:', error);
        document.getElementById('charts').innerHTML = `<p style="color: red;">数据加载失败: ${error.message}。请检查 'data.json' 文件是否存在，并且其内容是正确的 JSON 格式。</p>`;
    }
}

function createCheckboxes() {
    const container = document.getElementById('ckpt-checkboxes');
    container.innerHTML = '';
    const ckptNames = Object.keys(allData.ckpt_data);

    ckptNames.forEach(name => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = name;
        checkbox.checked = DEFAULT_CKPTS.includes(name);
        checkbox.addEventListener('change', updateCharts);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(name));
        container.appendChild(label);
    });
}

function updateCharts() {
    const selectedCkpts = getSelectedCkpts();
    if (selectedCkpts.length === 0) {
        barChart.clear();
        radarChart.clear();
        return;
    }

    const barSeries = selectedCkpts.map(ckptName => ({
        name: ckptName,
        type: 'bar',
        data: allData.ckpt_data[ckptName]
    }));
    
    const radarIndicators = allData.benchmarks.map((name, index) => {
        const allScoresForThisBenchmark = Object.values(allData.ckpt_data).map(scores => scores[index]);
        const maxScore = Math.max(...allScoresForThisBenchmark);
        return { name, max: Math.ceil(maxScore * 1.1) };
    });

    const radarSeriesData = selectedCkpts.map(ckptName => ({
        value: allData.ckpt_data[ckptName],
        name: ckptName
    }));

    barChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: selectedCkpts, top: 'bottom' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: allData.benchmarks, axisLabel: { interval: 0, rotate: 30 } },
        yAxis: { type: 'value' },
        series: barSeries
    }, true);
    
    radarChart.setOption({
        tooltip: { trigger: 'item' },
        legend: { data: selectedCkpts, top: 'bottom' },
        radar: { indicator: radarIndicators },
        series: [{
            name: 'CKPT综合能力',
            type: 'radar',
            data: radarSeriesData
        }]
    }, true);
}

function getSelectedCkpts() {
    const selected = [];
    document.querySelectorAll('#ckpt-checkboxes input:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    return selected;
}

window.addEventListener('resize', function() {
    barChart.resize();
    radarChart.resize();
});

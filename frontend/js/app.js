// --- ⬇️⬇️⬇️【请在这里配置你想默认显示的CKPT名称】⬇️⬇️⬇️ ---
// 注意：这里的名称必须和您飞书表格的列名（CKPT名称）完全一致
const DEFAULT_CKPTS = ['ckpt-14400', 'ckpt-16000', 'LLaVA-OneVision-7B', '0808-1-3-1000', '0808-1-3-1200', 'Qwen2.5-VL-7B']; 
// --- ⬆️⬆️⬆️【配置结束】⬆️⬆️⬆️ ---

// 后端 API 地址
// const API_URL = 'http://localhost:5002/api/data';
// const API_URL = '/benchmark/api/data';
// const API_URL = 'http://localhost:5003/api/data'; 
const API_URL = 'http://10.162.177.9:5003/api/data'; // 指向Mac端的API服务 

// 全局变量
let barChart, radarChart;
let allData = {};
let autoRefreshInterval; // 新增：自动刷新定时器

document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    fetchDataAndRender();
    startAutoRefresh(); // 新增：启动自动刷新
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
        console.log(response)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allData = await response.json();
        console.log(allData)
        if (allData.error) {
            throw new Error(allData.error);
        }

        barChart.hideLoading();
        radarChart.hideLoading();

        createCheckboxes();
        updateCharts();

    } catch (error) {
        console.error('获取或处理数据失败:', error);
        document.getElementById('charts').innerHTML = `<p style="color: red;">数据加载失败: ${error.message}。请检查后端服务是否开启，以及飞书配置是否正确。</p>`;
    }
}

function createCheckboxes() {
    const container = document.getElementById('ckpt-checkboxes');
    container.innerHTML = ''; // 清空"正在加载"提示
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
    
    // 为了雷达图更准确，动态计算每个维度的最大值
    const radarIndicators = allData.benchmarks.map((name, index) => {
        const allScoresForThisBenchmark = Object.values(allData.ckpt_data).map(scores => scores[index]);
        const maxScore = Math.max(...allScoresForThisBenchmark);
        return { name, max: Math.ceil(maxScore * 1.1) }; // 乘以1.1留出一些空间
    });

    const radarSeriesData = selectedCkpts.map(ckptName => ({
        value: allData.ckpt_data[ckptName],
        name: ckptName
    }));

    // 更新柱状图
    barChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: selectedCkpts, top: 'bottom' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: allData.benchmarks, axisLabel: { interval: 0, rotate: 30 } },
        yAxis: { type: 'value' },
        series: barSeries
    }, true); // true表示不和之前的option合并
    
    // 更新雷达图
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

// 新增：启动自动刷新功能
function startAutoRefresh() {
    // 每30秒自动刷新一次数据
    autoRefreshInterval = setInterval(() => {
        console.log('自动刷新数据...');
        fetchDataAndRender();
    }, 60000); // 30秒 = 30000毫秒
}

// 新增：停止自动刷新功能
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        console.log('已停止自动刷新');
    }
}

// 修改：在页面卸载时清理定时器
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// 监听窗口大小变化，让图表自适应
window.addEventListener('resize', function() {
    barChart.resize();
    radarChart.resize();
});

// 新增：手动刷新功能
function manualRefresh() {
    console.log('手动刷新数据...');
    fetchDataAndRender();
}

// 新增：切换自动刷新状态
function toggleAutoRefresh() {
    const toggleBtn = document.getElementById('toggle-btn');
    const statusText = document.getElementById('status-text');
    
    if (autoRefreshInterval) {
        stopAutoRefresh();
        toggleBtn.textContent = '开启自动刷新';
        toggleBtn.style.background = '#4CAF50';
        statusText.textContent = '自动刷新已暂停';
    } else {
        startAutoRefresh();
        toggleBtn.textContent = '暂停自动刷新';
        toggleBtn.style.background = '#ff9800';
        statusText.textContent = '自动刷新已开启';
    }
}

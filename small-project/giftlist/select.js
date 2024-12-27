const sheetId = '1QtMO1DqmyNIz6nP2QsnvF349I1im1EbIemDbCN6N_zw';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = '연말모임상품리스트(2022)';

const data = []

document.addEventListener('DOMContentLoaded', init)
const output = document.querySelector('.output')
function init() {
    update("Select A, B where C=true");
    
}

function update(query){
    const eq = encodeURIComponent(query);
    const url = `${base}&sheet=${sheetName}&tq=${eq}`

    fetch(url)
    .then(res => res.text())
    .then(rep => {
        //Remove additional text and extract only JSON:
        const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
        console.log(rep)
        const colz = [];
        const tr = document.createElement('tr');

        // 첫 줄 추출
        jsonData.table.cols.forEach((heading) => {
            if (heading.label) {
                let column = heading.label;
                colz.push(column);
                const th = document.createElement('th');
                th.innerText = column;
                tr.appendChild(th);
            }
        })

        // 데이터 추출
        jsonData.table.rows.forEach((rowData) => {
            const row = {};
            colz.forEach((ele, ind) => {
                row[ele] = (rowData.c[ind] != null) ? rowData.c[ind].v : '';
            })
            data.push(row);
        })
        
        getList(data);
    })
}

// 데이터 추출
function getList(json) {
    var list = [];
    json.forEach((row) => {
        const keys = Object.keys(row);
        var st= [];
        keys.forEach((c) => {st.push(row[c])})

        list.push(`(${st[0]})<br><br>${st[1]}`);
    })

    var ran = parseInt(Math.random()*list.length);
    document.getElementById('text').innerHTML = list[ran];
}
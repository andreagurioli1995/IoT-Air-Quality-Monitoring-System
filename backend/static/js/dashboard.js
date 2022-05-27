document.addEventListener("DOMContentLoaded", function (event) {
    const showNavbar = (toggleId, navId, bodyId, headerId) => {
        const toggle = document.getElementById(toggleId),
            nav = document.getElementById(navId),
            bodypd = document.getElementById(bodyId),
            headerpd = document.getElementById(headerId)

        // Validate that all variables exist
        if (toggle && nav && bodypd && headerpd) {
            toggle.addEventListener('click', () => {
                // show navbar
                nav.classList.toggle('show')
                // change icon
                toggle.classList.toggle('bx-x')
                // add padding to body
                bodypd.classList.toggle('body-pd')
                // add padding to header
                headerpd.classList.toggle('body-pd')
            })
        }
    }
    showNavbar('header-toggle', 'nav-bar', 'body-pd', 'header')
    const linkColor = document.querySelectorAll('.nav_link')
    function colorLink() {
        if (linkColor) {
            linkColor.forEach(l => l.classList.remove('active'))
            this.classList.add('active')
        }
    }
    linkColor.forEach(l => l.addEventListener('click', colorLink))
});

const addRow = (data) => {
    let length = data.length
    let tBody = document.getElementById('tbody')
    let child = tBody.lastElementChild;
    console.log('Length: ' + length)
    while (child) {
        tBody.removeChild(child);
        child = tBody.lastElementChild;
    }
    for (let i = 0; i < length; i++) {
        let id = data[i].id
        let tr = document.createElement('tr')
        let th = document.createElement('th')
        let td = document.createElement('td')
        let tdMqtt = document.createElement('td')
        let tdCoap = document.createElement('td')
        let tdIp = document.createElement('td')
        let tdAct = document.createElement('td')
        tdCoap.setAttribute('id', "coap-" + id)
        tdMqtt.setAttribute('id', "mqtt-" + id)
        th.setAttribute('scope', 'row')
        th.innerHTML = i
        td.innerHTML = id
        tdIp.innerHTML = data[i].ip
        if (data[i].mqtt == undefined || data[i].mqtt == null || data[i].mqtt == "") {
            tdMqtt.innerHTML = " - "
        } else {
            tdMqtt.innerHTML = data[i].mqtt + " ms"
        }

        if (data[i].coap == undefined || data[i].coap == null || data[i].coap == "") {
            tdCoap.innerHTML = " - "
        } else {
            console.log('Adding elements on TestCoap')
            tdCoap.innerHTML = data[i].coap + " ms"
        }

        let button = document.createElement('button')
        button.setAttribute('class', 'btn btn-danger mb-2')
        if(data[i].protocol == 0){
            // mqtt
            button.innerHTML = "Test MQTT"
            button.addEventListener('click', (e)=>{
                
            })
        } else {
            // coap
            button.innerHTML = "Test CoAP"
            button.addEventListener('click', (e)=>{

            })
        }
        tdAct.appendChild(button)
        tr.appendChild(th)
        tr.appendChild(td)
        tr.appendChild(tdMqtt)
        tr.appendChild(tdCoap)
        tr.appendChild(tdIp)
        tr.appendChild(tdAct)
        tr.setAttribute('id', data[i].id)
        tBody.appendChild(tr)
    }
}

const updateButton = document.getElementById('update-button');
updateButton.addEventListener('click', (e) => {
    $.get("get-sensor-data", function (data) {
        console.log(data)
        addRow(data)
    });
})

const setupButton = document.getElementById('setup-button');
setupButton.addEventListener('click', (e) => {
    // getting data
    _id = document.getElementById('sensor-id').value
    _minGas = document.getElementById('min-gas').value
    _maxGas = document.getElementById('max-gas').value
    _sampleFrequency = document.getElementById('sample-frequency').value

    jsonData = {
        id: _id,
        minGas: _minGas,
        maxGas: _maxGas,
        sampleFrequency: _sampleFrequency,
    }

    if ((Number.isInteger(_sampleFrequency) || _sampleFrequency == "") && (Number.isInteger(_minGas) || _minGas == "")
        && (Number.isInteger(_maxGas) || _maxGas == "") && id != "") {
        $.ajax({
            type: 'POST',
            url: '/update-setup',
            data: JSON.stringify(jsonData),
            contentType: "application/json; charset=utf-8",
            traditional: true,
            success: function (data) {
                if (data.status == 400) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Something went wrong! Parameters are not correct!',
                    })
                } else {
                    Swal.fire(
                        'Sensor Update',
                        'Values updated correctly.',
                        'success'
                    )
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong! Parameters are not correct!',
        })
    }
});
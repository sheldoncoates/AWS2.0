const url = 'http://localhost:3000/api/';

let STATE = {
    vms: [],
};

$(document).ready(function () {
    axios.get(url + "vm?ccId=1")
        .then(data => {
            STATE.vms = data.data.results.map(doc => doc.value);
            RenderDOM();
        })
        .catch(err => $('#allVMs').html("Could not get VMs"))
});
const createNewVM = () => {
    var vmType = document.getElementById('vmType').value;
    var body = {
        ccId: 1,
        config: vmType,
    }
    axios.post(url + 'vm', body)
        .then(data => {
            STATE.vms.push(data.data);
            RenderDOM();
        })
        .catch(err => console.log("Could not create VM"))
};

const startVM = (vmId, vmType, isRunning) => {
    var body = {
        ccId: 1,
        action: 'Start',
        config: vmType,
        isRunning: isRunning
    }

    axios.put(url + 'vm/' + vmId, body)
        .then(data => {
            const index = STATE.vms.findIndex(doc => doc.vmId == vmId);
            if (index != -1) {
                STATE.vms[index].eventType = 'Start';
                STATE.vms[index].isRunning = true;
                RenderDOM();
            };
        })
        .catch(err => console.log(`VM ${vmId} could not be started`))
};

const stopVM = (vmId, vmType, isRunning) => {
    var body = {
        ccId: 1,
        action: 'Stop',
        config: vmType,
        isRunning: isRunning
    }

    axios.put(url + 'vm/' + vmId, body)
        .then(data => {
            const index = STATE.vms.findIndex(doc => doc.vmId == vmId);
            if (index != -1) {
                STATE.vms[index].eventType = 'Stop';
                STATE.vms[index].isRunning = false;
                RenderDOM();
            };
        })
        .catch(err => console.log(`VM ${vmId} could not be stopped`))
};

const deleteVM = (vmId, vmType) => {
    const params = {
        ccId: 1,
        config: vmType,
    };

    axios.delete(url + 'vm/' + vmId + "?" + encodeGetParams(params))
        .then(data => {
            const index = STATE.vms.findIndex(doc => doc.vmId == vmId);
            if (index != -1) {
                STATE.vms[index].eventType = 'Delete';
                RenderDOM();
            };
        })
        .catch(err => console.log(`VM ${vmId} could not be deleted`))
};

const upgradeVM = (vmId, currentVM, isRunning) => {
    let newVM;
    if (currentVM == 'Basic') {
        newVM = 'Large';
    } else if (currentVM == 'Large') {
        newVM = 'Ultra-Large';
    } else {
        return alert('VM is Ultra-Large. Cannot upgrade.');
    };

    const body = {
        ccId: 1,
        action: 'Upgrade',
        config: newVM,
        isRunning: isRunning
    };
    axios.put(url + '/vm/' + vmId, body)
        .then(data => {
            const index = STATE.vms.findIndex(doc => doc.vmId == vmId);
            if (index != -1) {
                STATE.vms[index].config = newVM;
                RenderDOM();
            };
        })
        .catch(err => console.log(`VM ${vmId} could not be upgraded`))
};

const downgradeVM = (vmId, currentVM, isRunning) => {
    let newVM;
    if (currentVM == 'Ultra-Large') {
        newVM = 'Large';
    } else if (currentVM == 'Large') {
        newVM = 'Basic';
    } else {
        return alert('VM is Basic. Cannot downgrade.');
    };
    var body = {
        ccId: 1,
        action: 'Downgrade',
        config: newVM,
        isRunning: isRunning
    }

    axios.put(url + "/vm/" + vmId, body)
        .then(data => {
            const index = STATE.vms.findIndex(doc => doc.vmId == vmId);
            if (index != -1) {
                STATE.vms[index].config = newVM;
                RenderDOM();
            };
        })
        .catch(err => console.log(`VM ${vmId} could not be downgraded`))
};

const getVMUsage = (vmId) => {

    axios.get(url + "vm/" + vmId + "/minutes")
        .then(data => alert(`VM has been running for ${data.data.minutes} minutes`))
        .catch(err => console.log(`Error retrieving usage.`))
};

const getTotalVMUsage = (vmId) => {

    axios.get(url + "vm/" + vmId + "/cost")
        .then(data => alert(`VM has cost ${data.data.cost} dollars`))
        .catch(err => console.log(`Error retrieving total usage.`))
};

const getTotalVMUsageTimestamp = () => {
    var vmId = document.getElementById("id").value;
    var start = document.getElementById("start").value;
    var end = document.getElementById("end").value;
    axios.get(url + "vm/" + vmId + "/"+ start+"/"+end+"/minutes")
        .then(data => alert(`VM has usage ${data.data.minutes} minutes`))
        .catch(err => console.log(`Error retrieving total usage.`))
}

const getTotalVMCostTimestamp = () => {
    var vmId = document.getElementById("idcost").value;
    var start = document.getElementById("startcost").value;
    var end = document.getElementById("endcost").value;
    axios.get(url + "vm/" + vmId + "/"+ start+"/"+end+"/cost")
        .then(data => alert(`VM has $${data.data.cost} dollars`))
        .catch(err => console.log(`Error retrieving total usage.`))
}

const getTotalCost = () => {
    console.log(STATE.vms)
    let totalCost = 0;
    STATE.vms.forEach(function (vm) {

        axios.get(url + "vm/" + vm.vmId + "/cost")
            .then(data => {
                totalCost += parseFloat(data.data.cost);
                console.log(totalCost)
                $("#totalUsage").html('$' + totalCost.toString());
            })
            .catch(err => console.log(`Error retrieving total cost for VMs.`))

    })
}

function isOn(doc) {
    const { eventType, isRunning } = doc;
    if (eventType == 'Delete') {
        return 'Deleted';
    } else if (isRunning) {
        return 'Running';
    } else {
        return 'Not Running';
    };
};
function RenderDOM() {
    $('#allVMs').html(STATE.vms
        .filter(doc => doc.eventType != 'Delete')
        .reduce((str, doc) => str + buildLi(doc, true), '')
    );
    $('#deletedVMs').html(STATE.vms
        .filter(doc => doc.eventType == 'Delete')
        .reduce((str, doc) => str + buildLi(doc), '')
    );
};
function buildLi(eventDoc, showActionButtons) {
    let options = '';
    if (showActionButtons) {
        const upgradeVMButton = eventDoc.config != 'Ultra-Large' ? `<button class="btn btn-warning" onclick="upgradeVM(${eventDoc.vmId}, \'${eventDoc.config}\',\'${eventDoc.isRunning}\')">Upgrade VM</button>` : '';
        const downgradeVMButton = eventDoc.config != 'Basic' ? `<button class="btn btn-danger" onclick="downgradeVM(${eventDoc.vmId}, \'${eventDoc.config}\',\'${eventDoc.isRunning}\')">Downgrade VM</button>` : '';
        const deleteVMButton = !eventDoc.isRunning ? `<button class="btn btn-danger" onclick="deleteVM(${eventDoc.vmId}, \'${eventDoc.config}\')">Remove</button>` : '';
        const startVMButton = !eventDoc.isRunning ? `<button class="btn btn-light" onclick="startVM(${eventDoc.vmId}, \'${eventDoc.config}\',\'${eventDoc.isRunning}\')">Start</button>` : '';
        const stopVMButton = eventDoc.isRunning ? `<button class="btn btn-dark" onclick="stopVM(${eventDoc.vmId}, \'${eventDoc.config}\',\'${eventDoc.isRunning}\')">Stop</button>` : '';

        options = `
            ${startVMButton}
            ${stopVMButton}
            ${upgradeVMButton}
            ${downgradeVMButton}
            ${deleteVMButton}
        `;
    };

    const costVMButton = !eventDoc.isRunning ? `<button class="btn btn-info" onclick="getTotalVMUsage(${eventDoc.vmId})">Get VM Usage Cost</button>` : '';

    return `<li>
        <p style='margin:0px'>CC Id: ${eventDoc.ccId},
        VM Id: ${eventDoc.vmId},
        VM Type: ${eventDoc.config},
        VM State: ${isOn(eventDoc)}
        </p>
        ${options}
        <button class="btn btn-primary" onclick="getVMUsage(${eventDoc.vmId})">Get VM Usage</button>
        ${costVMButton}
    </li><br>`;
};
function encodeGetParams(p) {
    return Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&");
};


const moment = require('moment');
const express = require('express');
const router = express.Router();

const VMEvent = require('./models/VMEvent');
/**
 * Creates a VM
 * @param ccId
 * @param config
 * @return {VMEvent}
 */
router.post('/vm', async (req, res) => {
    const { ccId, config } = req.body;
    try {
        res.json(await (new VMEvent({
            ccId, config,
            timestamp: new Date(),
            vmId: await VMEvent.countDocuments(),
            eventType: 'Create',
            isRunning: false,
        }).save({validateBeforeSave: true})));
    } catch(error) {
        res.status(400).json({
            message: 'Error creating event.',
            error,
        });
    };
});

/**
 * @param ccId
 * @param action: 'Start', 'Upgrade', 'Downgrade', 'Stop'
 * @param isRunning
 * @param config: 'Basic', 'Large', 'Ultra-Large'
 * @return {VMEvent}
 */
router.put('/vm/:vmId', async (req, res) => {
    const { vmId } = req.params;
    let { ccId, action, config, isRunning } = req.body;

    if (action == 'Start') {
        isRunning = true;
    } else if (action == 'Stop') {
        isRunning = false;
    };
    
    try {
        res.json(await (new VMEvent({
            ccId, config, vmId, isRunning,
            eventType: action,
            timestamp: new Date(),
        }).save({validateBeforeSave: true})));
    } catch(error) {
        res.status(400).json({
            message: 'Error processing event.',
            error,
        });
    };
});

/**
 * @param ccId
 * @param config: 'Basic', 'Large', 'Ultra-Large'
 * @return {VMEvent}
 */
router.delete('/vm/:vmId', async (req, res) => {
    const { vmId } = req.params;
    const { ccId, config } = req.query;
    
    try {
        res.json(await (new VMEvent({
            ccId, config, vmId,
            eventType: 'Delete',
            timestamp: new Date(),
            isRunning: false,
        }).save({validateBeforeSave: true})));
    } catch(error) {
        res.status(400).json({
            message: 'Error deleting vm.',
            error,
        });
    };
});

/**
 * Fetches the latest event for every VM owned by the given customer
 * @param ccId
 * @return {[VMEvent]}
 */
router.get('/vm', (req, res) => {
    const { ccId } = req.query;
    VMEvent.mapReduce({
        query: { ccId },
        map: function() {
            emit(this.vmId, this);
        },
        reduce: function(k, vals) {
            var sortedVals = vals.sort(function(a, b) { return b.timestamp - a.timestamp; });
            return sortedVals[0];
        },
    })
    .then(results => res.json(results))
    .catch(error => res.status(400).json({
        message: 'Error getting vm.',
        error,
    }));
});

/**
 * Fetches all transactions pertaining to a VM
 * @return {[VMEvent]}
 */
router.get('/vm/:vmId/:start/:stop/minutes', (req, res) => {
    let vmId = req.params.vmId;
    let start = req.params.start;
    let stop = req.params.stop
    let startDate = new Date(start);
    let endDate = new Date(stop);

    VMEvent.find({vmId: vmId, timestamp: { $gte: startDate, $lt: endDate }})
        .sort({ timestamp: 1 })
        .then(results => {
            const INITIAL_STATE = {
                minutes: 0,
                lastDoc: null,
            };
            const usage = results.reduce((state, thisDoc, i) => {
                let { lastDoc, minutes } = state;
                if(lastDoc && lastDoc.isRunning && !thisDoc.isRunning) {
                    minutes += getMinutes(thisDoc, lastDoc);
                }/* else if(results.length - 1 == i && thisDoc.eventType == 'Start') { // if the vm is currently running
                    const presentTimeDoc = {
                        timestamp: new Date(), // we count usage up to now
                    };
                    minutes += getMinutes(presentTimeDoc, thisDoc);
                };*/
    
                lastDoc = thisDoc;
                return {lastDoc, minutes};
            }, INITIAL_STATE);
    
            res.json({
                minutes: moment.duration(usage.minutes, 'minutes').asMinutes(),
            });
        })
        .catch(error => res.status(400).json({
            message: 'Error getting vm.',
            error,
        }));
    
});

/**
 * Fetches all transactions pertaining to a VM
 * @return {[VMEvent]}
 */
router.get('/vm/:vmId/:start/:stop/cost', (req, res) => {
    let vmId = req.params.vmId;
    let start = req.params.start;
    let stop = req.params.stop
    let startDate = new Date(start);
    let endDate = new Date(stop);

    VMEvent.find({vmId: vmId, timestamp: { $gte: startDate, $lt: endDate }})
        .sort({ timestamp: 1 })
        .lean()
        .then(results => {
            const INITIAL_STATE = {
                cost: 0,
                lastDoc: null,
            };
    
            const usage = results.reduce((state, thisDoc, i) => {
                const { lastDoc } = state;
                if (lastDoc && lastDoc.isRunning) {
                    const price = getPrice(lastDoc);
                    const minutes = getMinutes(thisDoc, lastDoc);
                    state.cost += (price * minutes);
                };
                state.lastDoc = thisDoc;
                return state;
            }, INITIAL_STATE);
    
            res.json({
                cost: usage.cost.toPrecision(3),
            });
        })
        .catch(error => res.status(400).json({
            message: 'Error getting vm.',
            error,
        }));
    
});

/**
 * Fetches the latest transaction pertaining to a VM
 * @return {VMEvent}
 */
router.get('/vm/:vmId/latest', (req, res) => {
    VMEvent.find({ vmId })
        .sort({timestamp: -1})
        .limit(1)
        .then(results => res.json(results[0]))
        .catch(error => res.status(400).json({
            message: 'Error getting vm.',
            error,
        }));
});


/**
 * Gets VM minutes usage
 * @return {Number} minutes running
 * NOTE: does not include currently running cycle
 */
router.get('/vm/:vmId/minutes', (req, res) => {
    const {vmId} = req.params;

    VMEvent.find({
        vmId,
        eventType: {$in: ['Start', 'Stop']}
    })
    .sort({timestamp: 1})
    .then(results => {
        const INITIAL_STATE = {
            minutes: 0,
            lastDoc: null,
        };
        const usage = results.reduce((state, thisDoc, i) => {
            let { lastDoc, minutes } = state;
            if(lastDoc && lastDoc.isRunning && !thisDoc.isRunning) {
                minutes += getMinutes(thisDoc, lastDoc);
            }/* else if(results.length - 1 == i && thisDoc.eventType == 'Start') { // if the vm is currently running
                const presentTimeDoc = {
                    timestamp: new Date(), // we count usage up to now
                };
                minutes += getMinutes(presentTimeDoc, thisDoc);
            };*/

            lastDoc = thisDoc;
            return {lastDoc, minutes};
        }, INITIAL_STATE);

        res.json({
            minutes: moment.duration(usage.minutes, 'minutes').asMinutes(),
        });
    })
    .catch(error => res.status(400).json({
        message: 'Error getting vms.',
        error,
    }));
});


/**
 * Gets VM usage cost
 * @return {Number} cost in $ of the vm's usage cycles
 * NOTE: does not include currently running cycle
 */
router.get('/vm/:vmId/cost', (req, res) => {
    const { vmId } = req.params;

    VMEvent.find({
        vmId,
        eventType: {$in: ['Start', 'Upgrade', 'Downgrade', 'Stop']}
    })
    .sort({timestamp: 1})
    .lean()
    .then(results => {
        const INITIAL_STATE = {
            cost: 0,
            lastDoc: null,
        };

        const usage = results.reduce((state, thisDoc, i) => {
            const { lastDoc } = state;
            if (lastDoc && lastDoc.isRunning) {
                const price = getPrice(lastDoc);
                const minutes = getMinutes(thisDoc, lastDoc);
                state.cost += (price * minutes);
            };
            state.lastDoc = thisDoc;
            return state;
        }, INITIAL_STATE);

        res.json({
            cost: usage.cost.toPrecision(3),
        });
    })
    .catch(error => res.status(400).json({
        message: 'Error getting vms.',
        error,
    }));
});


function getPrice(doc) {
    const {config} = doc;
    return config == 'Basic' ? 0.05 : (config == 'Large' ? 0.10 : 0.15);
};

function getMinutes(newDoc, oldDoc) {
    const startTime = new Date(oldDoc.timestamp).getTime();
    const stopTime = new Date(newDoc.timestamp).getTime();
    return (stopTime - startTime) / (1000 * 60);
};

module.exports = router;
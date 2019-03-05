const mongoose = require('mongoose');

var VMEventSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true,
    },
    vmId: {
        type: Number,
        required: true,
        index: true,
        unique: false,
    },
    ccId: {
        type: Number,
        required: true,
    },
    config: {
        type: String,
        enum: ['Basic', 'Large', 'Ultra-Large'],
        required: true,
    },
    eventType: {
        type: String,
        enum: ['Create', 'Start', 'Upgrade', 'Downgrade', 'Stop', 'Delete'],
        required: true,
    },
    isRunning: {
        type: Boolean,
        required: true,
    },
});
module.exports = mongoose.model('vms', VMEventSchema);

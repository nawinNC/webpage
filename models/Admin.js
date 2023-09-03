const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    // id: Number,
    aname: String,
    apws: String,
    account_activate_state: Boolean
})

module.exports = mongoose.model('Admin', AdminSchema)

module.exports.saveAdmin = function(model,data) {
    model.save(data)
}
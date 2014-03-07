module.exports = new JSScopeController

function JSScopeController() {
  this.view = null
  this.state = null
}

var cons = JSScopeController
  , proto = cons.prototype

proto.activate = function scope_activate(state) {
  var self = this

  self.state = state
  self.state.attached = self.shouldAttach()

  if(self.state.attached) {
    self.createView()
  }

  atom.workspaceView.command('js-scope:show', show_view)
  atom.workspaceView.command('js-scope:toggle', toggle_view)

  function show_view() {
    self.createView().show()
  }

  function toggle_view() {
    self.createView().toggle()
  }
}

proto.deactivate = function scope_deactivate() {

}

proto.serialize = function scope_serialize() {
  return this.view.serialize()
}

proto.createView = function scope_createView() {
  if(this.view) {
    return this.view
  }

  return this.view = require('./view.js')(this.state)
}

proto.shouldAttach = function scope_shouldAttach() {
  if(atom.workspaceView.getActivePaneItem()) {
    return false
  }

  return true
}

var inherits = require('inherits')

var View = require('atom').ScrollView
  , hbs = require('handlebars')
  , crypto = require('crypto')
  , path = require('path')
  , $ = require('atom').$
  , fs = require('fs')

module.exports = JSScopeView

function JSScopeView() {
  if(!(this instanceof JSScopeView)) {
    return cons.apply(Object.create(proto), arguments)
  }

  View.apply(this, arguments)

  return this
}

inherits(JSScopeView, View)

var cons = JSScopeView
  , proto = cons.prototype

for(var key in View) {
  cons[key] = View[key]
}

cons.content = function() {
  var self = this

  self.div({class: 'js-scope-view tool-panel panel-right'}, function() {
    self.div({class: 'js-scope-view-scroller', outlet: 'scroller'}, function() {
      self.div({outlet: 'output'}, function() {

      })
    })

    self.div({class: 'js-scope-view-resize-handle', outlet: 'resizeHandle'}, function() {

    })
  })
}

proto.initialize = function view_initialize(state) {
  var self = this
    , ed

  View.prototype.initialize.apply(self, arguments)

  self.template = hbs.compile(
      fs.readFileSync(path.join(__dirname, 'scope.hbs'), 'utf8')
  )

  atom.workspace.eachEditor(function(editor) {
    self.attachEditor(editor)
    editor._updateJSScope()
  })

  atom.workspaceView.on('focusin', '.editor:not(.mini)', function(ev) {
    var targetEditor = ev.targetView() ? ev.targetView().getModel() : null

    if(!targetEditor) {
      return
    }

    if(!targetEditor._updateJSScope) {
      self.attachEditor(targetEditor._updateJSScope)
    }

    targetEditor._updateJSScope()
    targetEditor._jsScopeElement.show()
  })

  ed = atom.workspace.getActiveEditor()
  
  if(!ed) {
    return
  }

  ed._updateJSScope()
  ed._jsScopeElement.show()
}

proto.attachEditor = function view_attachEditor(editor) {
  var el = $('<div>', {'class': 'js-file-scope'})
    , template = this.template
    , last_el
    , scopes
    , last
    , ast

  el.hide()
  el.appendTo(this.output)
  editor._jsScopeElement = el

  var esprima = require('esprima')
    , escope = require('escope')

  editor.on('cursor-moved', oncursormove)
  editor.on('contents-modified', onmodified)
  editor._updateJSScope = onmodified

  return function() {
    onmodified()
    oncursormove()
  }

  function oncursormove() {
    if(editor.getGrammar().name !== 'JavaScript') {
      this.hide()

      return
    }

    var pos = editor.getCursorBufferPosition()

    if(!pos) {
      return
    }

    el.find('[data-id]').hide()

    var current = scopes.scopes[0]
      , ids = [0]

    while(inside(pos, current)) {
      var old = current

      for(var i = 0, len = current.childScopes.length; i < len; ++i) {
        if(inside(pos, current.childScopes[i])) {
          current = current.childScopes[i]
          ids.push(current._id)

          break
        }
      }

      if(!current.childScopes.length || current === old) {
        break
      }
    }

    el.find('[data-id=' + ids.join('],[data-id=') + ']').show()

    function inside(pos, scope) {
      if(pos.row === scope.block.loc.start.line - 1) {
        return pos.column >= scope.block.loc.start.column
      }

      if(pos.row === scope.block.loc.end.line - 1) {
        return pos.column <= scope.block.loc.end.column
      }

      return pos.row >= scope.block.loc.start.line - 1 &&
        pos.row < scope.block.loc.end.line - 1
    }
  }

  function onmodified() {
    if(editor.getGrammar().name !== 'JavaScript') {
      return
    }

    var buf = editor.getBuffer()
      , text = buf.getText()
      , hash
      , out

    hash = crypto.createHash('sha1').update(text).digest('hex')

    if(hash === last) {
      el.html('').append(last_el)

      return
    }

    try {
      Function(text)
    } catch(err) {
      return
    }

    ast = esprima.parse(text, {
        tolerant: true
      , loc: true
    })

    last = hash
    scopes = escope.analyze(ast)
    el.html('')

    out = $('<div>')

    window.scopes = scopes

    renderScope(
        scopes.scopes[0]
      , path.basename(editor.getUri() || '<file>')
      , out
      , 0
    )

    last_el = out.children()
    el.append(last_el)
  }

  function renderScope(scope, filename, into, id) {
    var out = $('<div>', {
        'class': 'scope'
    })

    scope._id = id
    out.attr('data-id', id)
    ++id

    for(var i = 0, len = scope.childScopes.length; i < len; ++i) {
      id = renderScope(scope.childScopes[i], filename, out, id)
    }

    scope.filename = filename
    out.append(template(scope))
    into.append(out)

    return id
  }
}

proto.serialize = function view_serialize() {

}

proto.destroy = function view_destroy() {
  console.log('destroy')
}

proto.toggle = function view_toggle() {
  if(this.hasParent()) {
    return this.detach()
  }

  atom.workspaceView.appendToRight(this)
}

var request = require('request');
var qs = require('qs');

var headers = {
        'Content-Type': 'application/json'
    };       



module.exports = function (RED) {

  function ConfluenceNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    var credentials = RED.nodes.getCredentials(n.id);
  }

  RED.nodes.registerType('confluence', ConfluenceNode, {
    credentials: {
      url: { type: 'text' },
      user: { type: 'text' },
      password: { type: 'password' }
    }
  });

    
    function confluence_request( credentials, path, method, callback ) {
        var opt = {
            headers: headers,
            url: credentials.url + path,
            method: method,
            auth: { user: credentials.user, password: credentials.password },
            json: true
        }
        request(opt,function(err,res,body){
           callback(err,res,body); 
        });
    }


    function f_read(node,credentials,msg) {
        
        var query_string=(isNaN(node.page)) ? "?"+qs.stringify({'title': node.page}) : '/' + node.page;
        console.log(query_string);
        var options = {
            url: credentials.url + '/content' + query_string,
            method: 'GET',
            headers: headers,
            auth: {
                user: credentials.user,
                password: credentials.password
            },
            json: true
        };       
        request(options, function (err, response, body) {
            if (err) {
                node.error(err.toString(), msg);
                node.status({ fill: 'red', shape: 'ring', text: 'failed' });            
            } else {
                msg.payload=response
                node.send(msg);
                node.status({});                
            }
        });
    }


    function _new_page(node,credentials,msg) {
        if( typeof(node.space) == "undefined") {
            node.error("space not defined",msg);
            node.status({ fill: 'red', shape: 'ring', text: 'failed'});
            return;            
        }
        var new_title = node.page || 'new pages';
        
        var body = {
            "type": "page",
            "title": node.page,
            "space": node.space,
            "body": {
                "storage": {
                    "value": msg.payload,
                    "representation": "storage"
                }
            }
        }        
        var options = {
            url: credentials.url + '/content',
            method: 'POST',
            headers: {'content-type': 'applcation/json'},
            auth: {
                user: credentials.user,
                password: credentials.password
            },
            form: body,
            json: true
        };       
        request(options, function (err, response, body) {
            if (err) {
                node.error(err.toString(), msg);
                node.status({ fill: 'red', shape: 'ring', text: 'failed' });            
            } else {
                msg.payload=response
                node.send(msg);
                node.status({});                
            }
        });        
        
    }
    
    function _update_page() {
        var options = {
            url: credentials.url + '/content/' + node.page,
            method: 'PUT',
            headers: {'content-type': 'applcation/json'},
            auth: {
                user: credentials.user,
                password: credentials.password
            },
            json: true,
            form: {"hoge":"fuga"}
        };       
        
    }


    function f_write(node,credentials,msg) {
        console.log(msg.payload);
        
        _new_page();
        
        
        var options = {
            url: credentials.url + '/content/' + node.page,
            method: 'GET',
            headers: {'content-type': 'applcation/json'},
            auth: {
                user: credentials.user,
                password: credentials.password
            },
            json: true,
            form: {"hoge":"fuga"}
        };       
        
    }

    function f_delete(node,credentials,msg) {
        var options = {
            url: credentials.url + '/content/' + node.page,
            method: 'GET',
            headers: {'content-type': 'applcation/json'},
            auth: {
                user: credentials.user,
                password: credentials.password
            },
            json: true,
            form: {"hoge":"fuga"}
        };       
        
    }


  var operation_func = {
    "write": f_write,
    "read": f_read,
    "delete": f_delete,
    "default": f_read
  };
  
  function ConfluenceOutNode(n) {
    RED.nodes.createNode(this, n);
    this.confluence = n.confluence;
    this.page = n.page; // title or id
    this.operation = n.operation;
    this.space = n.space;
    this.confluenceConfig = RED.nodes.getNode(this.confluence);
    if (this.confluenceConfig) {
      var node = this;
      var credentials = RED.nodes.getCredentials(this.confluence);
      node.convType = function (payload, targetType) {
        if (typeof payload !== targetType) {
          if (targetType == 'string') {
            payload = JSON.stringify(payload);
          } else {
            payload = JSON.parse(payload);
          }
        }
        return payload;
      };
      node.on('input', function (msg) {
        node.sendMsg = function (err, result) {
          if (err) {
            node.error(err.toString(), msg);
            node.status({ fill: 'red', shape: 'ring', text: 'failed' });
          } else {
            msg.payload = { 'id': result.id, 'fields': result.fields };
            node.status({});
          }
          node.send(msg);
        };
        if (typeof(credentials.user) == "undefined") {
            node.sendMsg('Undefined User in Credential'); return;
        }

        if (typeof(credentials.password) == "undefined") {        
          node.sendMsg('password Not found'); return;
        }
        if (typeof(credentials.url) == "undefined") {
          node.sendMsg('URL Not found'); return;
        }
                
        operation_func[( node.operation in operation_func ) ? node.operation : 'default'](node,credentials,msg);

      });
    } else {
      this.error('missing confluence configuration');
    }
  }
  RED.nodes.registerType('confluence out', ConfluenceOutNode);
}
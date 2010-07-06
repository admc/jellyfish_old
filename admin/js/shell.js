var that = this;

logic = {};
logic.hist = [];
logic.histPos = 0;
//logic.histLength = 20;

//making dir also work as a function call
var dir = function(obj) {
  for (prop in obj) {
     logic.send(prop);
   }
}
//onkeypress events attached to the UI
var okp = function(event) {
  if ((event.keyCode == 13) && (event.shiftKey == false)) {
     if (event.target.id == "XUSHInput") {
       event.preventDefault();
       logic.enter(event); 
     }
  }
};    

logic.gmr = function() {
  return window;
}
//get a reference to the output console
logic.jout = function() {
  return this.gmr().document.getElementById('XUSHOutput');
}
//get a reference to the output console
logic.jin = function() {
  return this.gmr().document.getElementById('XUSHInput');
}

logic.jo = function() {
  return this.gmr().document.getElementById('XUSHOverlay');
}

logic.sendCmd = function(s) {
  this.jout().insertBefore(this.entry('<font color="tan">xush%</font> <font color="white">'+s+'</font>'), this.jout().childNodes[0]);
  //this.jout().insertBefore(this.entry('<br>'), this.jout().childNodes[0]);
}

//send output to console
logic.send = function(s) {
  if (s == undefined) {
    return;
  }
  this.jout().insertBefore(this.entry('&nbsp;&nbsp;'+s), this.jout().childNodes[0]);
}

//logic to handle each of the command inputs
logic.handle = function(cmd) {
  
  //if the command has spaces -- args
  var cmdArr = cmd.split(' ');
  
  switch(cmdArr[0]) {
  //clear window 
  case 'clear':
    this.jout().innerHTML = "";
    break;
  
  case 'exit':
    this.jo().style.display = "none";
    break
     
  //dir
  case 'dir':
    //if has an arg
    if (cmdArr[1]) {
      try {
        var arg = eval(cmdArr[1]);
        for (prop in arg) {
          this.send(prop);
        }
      } catch(err) {
        this.send('<font color="red">'+err+'</font>');
      }
    }
    else {
      for (prop in that) {
        this.send(prop);
      }
    }
    this.sendCmd(cmd);
    break;
    
  //help case
  case 'help':
    var opts = [];
    opts.push('<b>XUSH Help!<b>')
    opts.push('dir -- default shows you the current scope, \'dir obj\' or \'dir(obj)\' will show you the properties of the object.');
    opts.push('window -- reference to current content window.');
    opts.push('clear -- reset the output.');
    
    while(opts.length != 0) {
      this.send(opts.pop());
    }
    this.sendCmd(cmd);
    break;
  
  //defaut is to eval
  default:
     try {
       var res = eval.call(that, cmd);
       if ((cmd.indexOf('=') == -1) && (res == null)) {
         this.send(cmd + ' is null.')
       }
       else { this.send(res); }
     }
     catch(err) {
       this.send('<font color="red">'+err+'</font>');
       throw err;
     }
     this.sendCmd(cmd);
  }
  
  this.jin().value = "";
  this.jin().focus();
}

//generate a new output entry node
logic.entry = function(val) {
  var nd = this.gmr().document.createElement('div');
  nd.style.textAlign = "left";
  nd.style.paddingLeft = "20px";
  nd.style.paddingBottom = "1px";
  nd.style.color = "lightblue";
  nd.style.font = "12px arial";
  nd.innerHTML = val;
  return nd;
}

//when the user presses enter
logic.enter = function(event) {
  var inp = this.gmr().document.getElementById('XUSHInput');
  inp.value = $.trim(inp.value);
  //ignore empty returns
  if ((inp.value == "") || (inp.value == " ")) {
    return;
  }
  //if we have less than histLength
  //if (this.hist.length < this.histLength) {
    this.hist.unshift(inp.value);
    this.histPos = this.hist.length -1;
  // }
  //   else {
  //     this.hist.pop();
  //     this.hist.unshift(inp.value);
  //   }
    //pass input commands to the handler
  this.handle(inp.value);
};

//build the whole ui             
logic.build = function() {
  var jo = this.gmr().document.getElementById('XUSHOverlay');
  
  //if we can't get ahold of the overlay
  if (!jo) {
      var d = this.gmr().document.createElement('div');
        d.style.width = "98%";
        d.style.height = "100%";
        d.style.paddingLeft = "20px";
        d.style.zIndex = "9999";
        d.id = "XUSHOverlay";
        d.style.display = "block";
        d.addEventListener("keydown", function(event) { i.focus(); }, false);
                   
      var i = this.gmr().document.createElement('textarea');
        //i.size = "50";
        i.id = "XUSHInput";
        i.value = "What's on your mind?";
        i.style.width = "90%";
        i.cols = "32";
        i.rows = "1";
        i.style.color = "white";
        i.style.background = "black";
        i.style.border = "1px solid #aaa";
        i.style.fontSize = "20px";
        i.addEventListener("keydown", function(event) {
          if (event.target.value == "What's on your mind?") {
            event.target.value = "";
          }
          //if there is a command history
          if (logic.hist.length != 0) {
            //uparrow
            if ((event.keyCode == 38) && (event.charCode == 0) && (event.shiftKey == true)) {
              if (logic.histPos == logic.hist.length -1) {
                logic.histPos = 0;
              } else {
                logic.histPos++;
              }
              logic.jin().value = logic.hist[logic.histPos];
            }
            //downarrow
            if ((event.keyCode == 40) && (event.charCode == 0) && (event.shiftKey == true)) {
              if (logic.histPos == 0) {
                logic.histPos = logic.hist.length -1;
              } else {
               logic.histPos--; 
              }
              logic.jin().value = logic.hist[logic.histPos];
            }
          }
        }, false);
        d.appendChild(i);   
      
      var o = this.gmr().document.createElement('div');
        //i.size = "50";
        o.id = "XUSHOutput";
        o.style.width = "90%";
        o.style.height = "400px";
        o.style.background = "black";
        o.style.border = "1px solid #aaa";
        o.style.fontSize = "20px";
        o.style.overflow = "auto";
        
        o.addEventListener("keydown", function(event) { i.focus(); }, false);
        
      d.appendChild(o);   
      //this.gmr().document.body.appendChild(d);
      document.getElementById('shell').appendChild(d);
      this.gmr().document.getElementById('XUSHInput').focus();      
  }
  //toggle it
  else {
    if (jo.style.display == "block") {
      jo.style.display = "none";
    }
    else {
      jo.style.display = "block";
      this.gmr().document.getElementById('XUSHInput').focus();
    }
  }
};

$(document).ready(function(){
  logic.build();
  $(window).bind('keypress', okp);
});

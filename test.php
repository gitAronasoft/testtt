<!DOCTYPE html>
<html>
<head>
  <title>Video Player</title>
  <style>
    body { margin: 0; background: #000; }
    iframe { width: 100vw; height: 100vh; border: none; }
  </style>
</head>
<body>
  <div id="player"></div>

  <script>
    function onYouTubeIframeAPIReady() {
      new YT.Player('player', {
        videoId: 'vLNui_QmuKM',
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0
        }
      });
    }
  </script>
  <script src="https://www.youtube.com/iframe_api"></script>

  <!-- Disable right click and dev tools -->
  <script>
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function(e) {
      if (e.keyCode == 123 || 
          (e.ctrlKey && e.shiftKey && ['I','C','J','U'].includes(String.fromCharCode(e.keyCode)))) {
        return false;
      }
    };
  </script>
</body>
</html>

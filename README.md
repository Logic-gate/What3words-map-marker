# what3words-map-marker
A simple "responsive" JS script that integrates what3words into a GoogleMaps canvas

The script aims to aid those who wish to integrate [what3words](http://www.what3words.com) into their existing projects by providing a `marker` based selection process; move the marker, get the three words. It uses the default  [what3word-js-wrapper](https://github.com/what3words/w3w-javascript-wrapper).

# Instructions on getting the demo to work

 * Make sure you add your own API key in `what3words.js`
 * Make sure you add your own GoogleMaps key in line `45` on `demo.html` 

If you are wondering how to catch the three words, as to pass it along or to store it; you can do so by capturing `ret` in the `what3WordsConvert` function from `what3words-map-marker.js`. 

Example:

```
var what3WordsConvert = function(lat, lng) {
    what3words.positionToWords([lat, lng], function (ret) {
        document.getElementById('current').innerHTML = '<p>'+ ret.join('.') +'</p>';
        alert(ret); //This will create a popup with the selected three words
        document.getElementById('three-word').value  = ret.join('.');
    });
  }
```

Please note, `demo.html` is just a demo. You will need to write up your own handlers in `what3words-map-marker.js` for passing the three words.

For more information about the what3words' api, head over to [ http://developer.what3words.com/api](http://developer.what3words.com/api)

# Screenshot
Screenshot of `demo.html`
![demo.html](http://i.imgur.com/194Dp6F.png)

Screenshot from [Rukny](http://www.rukny.com
![rukny demo](http://i.imgur.com/qG5is22.png)



# Credits  
The script was originally developed by [Stream Digital](http://www.streamdigital.com/) for [Rukny](http://www.rukny.com)

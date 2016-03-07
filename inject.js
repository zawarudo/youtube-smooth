var $originalSearch;
var $mySearch;
var bgOn;

$(document).ready(function(){
  saveSearchBars();
  options();
  regeneratePlaylist();
  changeSearchBar();
});

$("video").bind('ended', function(){  
  document.location = $(".autoplay-bar ul li:first-child a:first-child").attr("href");
});

function saveSearchBars() {
  $originalSearch = $("#masthead-search");
  $mySearch = setupSearchBar();
  $("#yt-masthead-content").append($mySearch);
}

function options() {
  chrome.extension.sendRequest({storage:"bgOn"}, function(response) {
    var bgOn;
    if (typeof autoplaylist === "undefined") {
      chrome.extension.sendRequest({storage:"bgOn", value: true});
      bgOn = true;
    } else {
      bgOn = JSON.parse(response.storage);
    }
    console.log("---> " + bgOn);
    $(".myoptions").remove();

    var $options = $(`
       <div class="myoptions checkbox-on-off">
         <label for="background-checkbox">Background search</label>
         <span class="yt-uix-checkbox-on-off ">
         <input class="background-checkbox" class="" type="checkbox"><label for="background-checkbox" id="background-checkbox-label"><span class="checked"></span><span class="toggle"></span><span class="unchecked"></span></label>  </span>

       </div>
    `);
    $options.insertAfter($(".checkbox-on-off"));
    $(".background-checkbox").prop("checked", bgOn);
    $(".myoptions").css("right", "104px");
  
    $(".background-checkbox").click(function () {
      chrome.extension.sendRequest({storage:"bgOn"}, function(response) {
        if (JSON.parse(response.storage)) {
          chrome.extension.sendRequest({storage:"bgOn", value: false});
        } else {
          chrome.extension.sendRequest({storage:"bgOn", value: true});
        }
        changeSearchBar();
        options(); 
        $(".background-checkbox").prop("checked", bgOn);
      });
    });

    $(".autoplay-hovercard.yt-uix-hovercard").remove();
    $(".watch-sidebar-head").text("Your Playlist:");
  });
}

function setupSearchBar() {
  $searchBar = $(`
<div id="my-masthead-search" class="search-form consolidated-form">
  <button id="my-search-btn" class="yt-uix-button yt-uix-button-size-default yt-uix-button-default search-btn-component search-button" tabindex="2" id="search-btn">
    <span class="yt-uix-button-content">Search</span>
  </button>
  <div id="my-masthead-search-terms" class="masthead-search-terms-border " dir="ltr">
    <input id="my-masthead-search-term" autocomplete="off" class="search-term masthead-search-renderer-input yt-uix-form-input-bidi" type="text" tabindex="1" title="Search" dir="ltr" spellcheck="true" style="outline: none;">
  </div>
</div>
`);

  $searchBar.hide();

  $searchBar.find("#my-search-btn").click(runThisLittleBeastInstead);
  $searchBar.find("input").keydown(function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == 13) {
      runThisLittleBeastInstead();
    }
  })

  return $searchBar;
}

function changeSearchBar() {
  // If this is a video
  if(window.location.href.indexOf("www.youtube.com/watch?v=") != -1) {
    chrome.extension.sendRequest({storage:"bgOn"}, function(response) {
      var bgOn;
      if (typeof autoplaylist === "undefined") bgOn = true;
      else bgOn = JSON.parse(response.storage);
      if (bgOn) { 
        $mySearch.find("input").val($originalSearch.find("input").val());
        $mySearch.show();
        $originalSearch.hide();
      } else {
        $originalSearch.find("input").val($mySearch.find("input").val());
        $originalSearch.show();
        $mySearch.hide();
      }
    });
  } else {
    $originalSearch.find("input").val($mySearch.find("input").val());

    $mySearch.hide();
    $originalSearch.show();
  }
}

function runThisLittleBeastInstead() {
  if($mySearch.find("input").val() == "") return;
  addOverlay();
  getSearchResults();
}

function addOverlay() {
  var overlay = jQuery('<div id="my-overlay"><div class="loader"></div></div>');
  $('#watch7-sidebar').append(overlay);
}

function removeOverlay() {
  $("#my-overlay").remove();
  $("#my-overlay-spinner").remove();
}

function getSearchResults() {
  var query = "/results?search_query=" + encodeURIComponent($mySearch.find("input").val());
  var results;

  $.ajax({
    url: query,
    type: "post",
    dataType: "html",
    success: function(data){replaceSidebar(data, $mySearch.find("input").val())},
  });
}

function replaceSidebar(data, query) {
  $nodes = $(data).find(".yt-lockup");

  var newNodes = []; 
  var node;
  $nodes.each(function() {
    node = createNewSideRes($(this));
    if (node != null)
      newNodes.push(createNewSideRes($(this)));
  });

  $("#generated-res").remove();
  $("#watch7-sidebar-contents #watch-related.video-list").empty();
  $("#watch7-sidebar-contents #watch-related.video-list").append($("<div id='generated-res' class='watch-sidebar-section'>Search results for: <i><b>" + query + "</b></i></div>"));
  newNodes.forEach(function(node) {
    $("#watch7-sidebar-contents #watch-related.video-list").append(node);
  })

  $(".add-to-playlist").click(function(e) {
    e.preventDefault();
    addToPlaylist($(this).parent().parent().parent());
    $(this).find("button").text("Added!").unbind("click");
  });
 
  removeOverlay();
}

jQuery.fn.outerHTML = function() {
  return jQuery('<div />').append(this.eq(0).clone()).html();
};

function addToPlaylist($searchElem) {
  chrome.extension.sendRequest({storage: "autoplaylist"}, function(response) {
    var list;
    if (typeof response.storage === "undefined") {
      list = [$searchElem.outerHTML()];
    } else {
      list = JSON.parse(response.storage);
      list.push($searchElem.outerHTML());
    }
    console.log(list);
    chrome.extension.sendRequest({storage: "autoplaylist", value: JSON.stringify(list)});
  });
  regeneratePlaylist();
}

function regeneratePlaylist() {
  chrome.extension.sendRequest({storage: "autoplaylist"}, function(response) {
    console.log(autoplaylist);
    if (typeof response.storage === "undefined") return;
    var autoplaylist = JSON.parse(response.storage);
  
    // Keep the original autoplay vid if we have none queued
    if (autoplaylist.length == 0) return null; 
    $(".autoplay-bar ul").empty();
    for (var i = 0; i < autoplaylist.length; ++i) {
      $playlistItem = $(autoplaylist[i]);
      console.log($playlistItem);
      // if this video is currently playing, remove it from playlist 
      if (window.location.toString().indexOf($playlistItem.find("a").attr("href")) > -1) {
        autoplaylist.splice(i--, 1);
        chrome.extension.sendRequest({storage: "autoplaylist", value: JSON.stringify(autoplaylist)});
        return; // this actually means continue
      }
      $playlistItem.find(".add-to-playlist").remove();
      if (i === autoplaylist.length - 1) {
        $playlistItem.hide();
        $(".autoplay-bar ul").append($playlistItem);
        $playlistItem.slideDown();
      } else {
        $(".autoplay-bar ul").append($playlistItem);
      }
    }
  });
}

function createNewSideRes($normalSearchResult) {
  var duration = $normalSearchResult.find(".accessible-description").text().replace(" - Duration: ", "").replace("Already watched.", "").replace(".", "");
  if (!duration.match(/[0-9]+:[0-9]/)) return;
  var ago = $normalSearchResult.find(".yt-lockup-meta-info li:nth-child(1)").text();
  var title = $normalSearchResult.find(".yt-lockup-title a").text();
  var channel = $normalSearchResult.find(".yt-lockup-byline a").text();
  var channelHref = $normalSearchResult.find(".yt-lockup-byline a").attr("href");
  var views = $normalSearchResult.find(".yt-lockup-meta-info li:nth-child(2)").text();
  var image = $normalSearchResult.find(".yt-thumb-simple img").data("thumb");
  var url = $normalSearchResult.find(".yt-lockup-title a").attr("href");
  var videoID = url.replace("/watch?v=", "");
  
  var id = "a" + Math.random().toString(26).slice(10);
  
  if (typeof image === "undefined")
    image = $normalSearchResult.find(".yt-thumb-simple img").attr("src");

$newRes = $(`
<li class="video-list-item related-list-item related-list-item-compact-video">
  <div class="content-wrapper">
  <a href="${url}" class="yt-uix-sessionlink content-link spf-link" title="${title}">
    <span class="title">
      ${title}
    </span>
    <span class="accessible-description" id="description-id-325936">
       - Duration: ${duration}.
    </span>
    <span class="stat attribution">
      <span class="g-hovercard">
        ${title}
      </span>
    </span>
    <span class="stat view-count">${views}</span>
    <span class="stat add-to-playlist" data-video-id="${url}"><button class="add-playlist">Add to playlist</button></span>
  </a>
  </div>
  <div class="thumb-wrapper">
    <a href="${url}" class="yt-uix-sessionlink thumb-link spf-link" tabindex="-1"><span class="yt-uix-simple-thumb-wrap yt-uix-simple-thumb-related" tabindex="0"><img aria-hidden="true" width="120" alt="" src="${image}" height="90"></span>
    </a>
    <span class="video-time">
      ${duration}
    </span>
</div>

</li>
`);
  return $newRes;
}

// On page "reload" - youtube is kinda a single page app so
// listen in bg.js for page reloads
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // sucks, but this timeout needs to be here
  setTimeout(function(){
    options();
    changeSearchBar();
    regeneratePlaylist();
  }, 1000);
});

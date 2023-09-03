const { json } = require("body-parser");

let search = $("#livesearch")

function showResults(str){  
    if(str.lenght === 0){
        search.addClass("hide");
    }else{
        search.removeClass("hide");
    }

    $.ajax({
        url: "/search",
        contentType: "json",
        method: "POST",
        data: JSON.stringify({query: str}),
        success: function(result){
            search.html(result.response);
        }
    })
}
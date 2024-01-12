generateMeals = () => {
    var input = document.getElementById("food_file_id");
    var contents;
    if(!contents){
        contents = loadFile();
    }
    console.log(contents);
}
loadFile = () => {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "./files/food.csv", false);
    xmlhttp.send();
    if (xmlhttp.status==200) {
      result = xmlhttp.responseText;
    }
    return result;
}

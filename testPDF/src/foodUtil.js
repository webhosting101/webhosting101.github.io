generateMeals = () => {
    var input = document.getElementById("food_file_id");
    var contents;
    if(!contents){
        contents = loadFile();
    }
    console.log(contents);

    var eachCSVLine = contents.split('\n');
    var csvtoJSONFile = [];
    var headers = eachCSVLine[0].split(',');
    for(var i = 1; i < eachCSVLine.length; i++) {
        var data = eachCSVLine[i].split(',');
        var obj = {};
        for(var j = 0; j < data.length; j++) {
            obj[headers[j].trim()] = data[j].trim();
        }
        csvtoJSONFile.push(obj);
    }

    console.log(csvtoJSONFile);
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

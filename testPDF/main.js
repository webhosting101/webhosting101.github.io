//import {pdfjsGetDoc} from "./src/util.js"
// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];
var datass = '';
var DataArr = [];
pdfjsLib.workerSrc = '';
function validateFile(){
    //clear out the table
    document.getElementById('output').innerHTML = '';
    //hide password input for initial assesment
    document.getElementById("passDiv").style = 'display: none;';
    //get file to process
    var input = document.getElementById("file-id");
    if(input.files[0].name.indexOf("[") == -1 
    || input.files[0].name.indexOf("]") == -1){
        alert('File name should be \'[Gcash/BPI CC] xxxxxxxx.pdf\'');
        document.getElementById("generate").disabled = true;
    }else{
        document.getElementById("generate").disabled = false;
        pdfjsGetDoc(input,true);
    }
}
function extractText() {
    var input = document.getElementById("file-id");
    var password = document.getElementById("password");
    pdfjsGetDoc(input,false);
}
function pdfjsGetDoc(input,isValidate){
    //getPassword
    var password = document.getElementById("password");
    //this will turn the PDF to binary to be consumed by the PDFJS lib
    var fReader = new FileReader();
    fReader.readAsBinaryString(input.files[0]);
    fReader.onloadend = function (event) {
        pdfjsLib.getDocument({ data: event.target.result, password: password.value }).promise.then(function(pdf) {
            // PDF loading Success
            //this will force an error if password is requred and not given
            console.log(pdf);
            if(isValidate){
                return;
            }
            // Create an array that will contain our promises
            var pagesPromises = [];

            for (var i = 0; i < pdf._pdfInfo.numPages; i++) {
                // Required to prevent that i is always the total of pages
                (function (pageNumber) {
                    // Store the promise of getPageText that returns the text of a page
                    pagesPromises.push(getPageText(pageNumber, pdf));
                })(i + 1);
            }

            // Execute all the promises
            Promise.all(pagesPromises).then(function (pagesText) {
                var documentName = input.files[0].name;
                var docType = documentName.substring(
                    documentName.indexOf("[") + 1, 
                    documentName.lastIndexOf("]")
                );
                
                if(docType.toLowerCase() === "gcash"){
                    gcashParser(pagesText);
                }else if(docType.toLowerCase() === "maya"){

                }else if(docType.toLowerCase() === "bpi cc"){
                    bpiCCParser(pagesText);
                }
            });
        }, function (reason) {
            // PDF loading error
            console.log(reason);
            if(reason.name === 'PasswordException'){
                document.getElementById("passDiv").style = '';
            }
        });
    }
}
function getPageText(pageNum, PDFDocumentInstance) {
    // Return a Promise that is solved once the text of the page is retrieven
    return new Promise(function (resolve, reject) {
        PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
            // The main trick to obtain the text of the PDF page, use the getTextContent method
            pdfPage.getTextContent().then(function (textContent) {
                console.log(textContent.items);
                //textItems = object, parameters of the taken string from the PDF
                var textItems = textContent.items;
                var finalString = "";
                //this means that
                for (var i = 0; i < textItems.length; i++) {
                    var getString = textItems[i].str;
                    var matchWordBeforeSpace = getString.match(/([^\s]+)/g);
                    //console.log(matchWordBeforeSpace[0]);
                    if(matchWordBeforeSpace && matchWordBeforeSpace[0].length === 1){
                        //this means that the word is seperated by space IE 'C U S T O M E R'
                        finalString += textItems[i].str.replace(/\s/g, "")+' ';
                    }else if(textItems[i].height > 0){//this will only get the whole words
                        finalString += textItems[i].str+' ';
                    }

                }
                // Solve promise with the text retrieven from the page
                resolve(finalString);
            });
        });
    });
}
function downloadCSV() {
    var getTableRows = document.getElementById('tableData').children[0].children;
    let csvStr='';
    for (let row of getTableRows) {
        if(row.textContent.indexOf('Count') == -1){
            for (let column of row.children) {
                if(column.tagName == 'TH'){
                    csvStr += column.textContent+',';
                }else{
                    csvStr += column.firstChild.value+',';
                }
                csvStr.slice(0, -1);
            }
            csvStr +='\n';
        }
    }

    if(csvStr){
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvStr);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'import_bluecoins.csv';
        hiddenElement.click();
    }
}
function createTable(tableData){
    let downloadCSVButton = document.getElementById('csvButton');
    if(tableData){
        let tableDOM = '<table id="tableData"><tr><th colspan="'+Object.keys(tableData[0]).length+'">Transaction Count: '+tableData.length+'</th></tr>';
        let tableHeader='';
        tableData.forEach(row => {
            //console.log(row)
            let getKeys = Object.keys(row);
            //generate table headers
            if(!tableHeader){
                tableHeader += '<tr>';
                    getKeys.forEach(header => {
                    tableHeader += '<th>'+header+'</th>';
                });
                tableHeader += '</tr>';
                tableDOM += tableHeader;
            }
            //generate table data
            let tableRowData = '<tr>';
            getKeys.forEach(header => {
                let cols = (row[header].length<3)?5:10;
                tableRowData += '<td><textarea row="1" cols="'+cols+'">'+row[header]+'</textarea></td>';
            });
            tableRowData += '</tr>';
            tableDOM += tableRowData;
        });
        tableDOM += '</table>';
        document.getElementById('output').innerHTML = tableDOM;
        downloadCSVButton.disabled = false;
    }else{
        downloadCSVButton.disabled = true;
    }
}
function gcashParser(pagesText) {
    // Display text of all the pages in the console
    // e.g ["Text content page 1", "Text content page 2", "Text content page 3" ... ]
    // console.log(pagesText); // representing every single page of PDF Document by array indexing
    //var outputStr = "";
    let startingIndicator = ' STARTING BALANCE ';
    let endingIndicator = ' ENDING BALANCE ';
    let startingBalance = 0;
    let tableData = [];
    for (var pageNum = 0; pageNum < pagesText.length; pageNum++) {
        //get the year on the PDF File
        let pdfYear = pagesText[pageNum].split('History ')[1].substring(0, 4);
        let perRow = pagesText[pageNum].split(' '+pdfYear+'-');//year today
        //outputStr += "<br/><br/>Page " + (pageNum + 1) + " contents <br/> <br/>";
        //outputStr +="(1)Type,(2)Date,(3)Item or Payee,(4)Amount,(5)Parent Category,(6)Catergory,(7)Account Type,(8)Account,(9)Notes,(10)Label,(11)Status,(12)Split";
        for (var rowNum = 0; rowNum < perRow.length; rowNum++) {
            let row = perRow[rowNum];
            if(row.indexOf(startingIndicator) > -1){
                startingBalance = parseFloat(row.split(startingIndicator)[1]);
            }
            console.log(row,startingBalance);
            if (row.indexOf(' AM ') > -1 || row.indexOf(' PM ') > -1) {// transactions only
                //this will split the last row to just get the transaction
                if(rowNum == perRow.length-1){
                    row = row.split(endingIndicator)[0];
                }
                let tableRow = {};
                let splitRow = row.split(' ');
                console.log(splitRow);
                //(1)Type
                let debit = parseFloat(startingBalance-parseFloat(splitRow[splitRow.length-2])).toFixed(2)==parseFloat(splitRow[splitRow.length-1]).toFixed(2);
                console.log(debit,parseFloat(startingBalance-parseFloat(splitRow[splitRow.length-2])).toFixed(2),parseFloat(splitRow[splitRow.length-1]).toFixed(2));
                if(debit){
                    tableRow['(1)Type'] = 'e';
                    startingBalance = startingBalance-parseFloat(splitRow[splitRow.length-2]);
                }else{
                    tableRow['(1)Type'] = 'i';
                    startingBalance = startingBalance+parseFloat(splitRow[splitRow.length-2]);
                }
                //(2)Date logic
                let dateSplit = splitRow[0].split('-');//MM-DD
                let timeSplit = splitRow[1].split(':');//HH:MM
                let timeIn24h = (splitRow[2] === 'AM')?splitRow[1]:(parseInt(timeSplit[0])+12)+':'+timeSplit[1];
                tableRow['(2)Date'] = dateSplit[0]+'/'+dateSplit[1]+'/'+pdfYear+' '+timeIn24h;
                //(3)Item or Payee logic
                let itemPayee ='';
                for(let wordLoc = 3; wordLoc < splitRow.length - 3; wordLoc++){ 
                    itemPayee += splitRow[wordLoc]+' ';
                }
                tableRow['(3)Item or Payee'] = itemPayee.substring(0, itemPayee.length - 1);
                //(4)Amount logic
                tableRow['(4)Amount'] = splitRow[splitRow.length-2];
                //(5)Parent Category logic
                tableRow['(5)Parent Category'] = 'OTHERS';
                //(6)Category logic
                tableRow['(6)Category'] = 'Others';
                //(7)Account Type logic
                tableRow['(7)Account Type'] = 'VIRTUAL ACCOUNTS';
                //(8)Account logic
                tableRow['(8)Account'] = 'Gcash';
                //(9)Notes logic
                tableRow['(9)Notes'] = '';
                //(10)Label logic
                tableRow['(10)Label'] = 'Gcash';
                //(11)Status logic
                tableRow['(11)Status'] = '';
                //(12)Split logic
                tableRow['(12)Split'] = '';
                console.log(tableRow);
                tableData.push(tableRow);
            }
        }
    }
    createTable(tableData);
}
function bpiCCParser(pagesText) {
    console.log(pagesText); // representing every single page of PDF Document by array indexing
    let enablePageText = false;
    let unbilledCount = 0;
    let unbilledTemp = false;
    let yearUsed;
    let months = {
        'January':'01',
        'February':'02',
        'March':'03',
        'April':'04',
        'May':'05',
        'June':'06',
        'July':'07',
        'August':'08',
        'September':'09',
        'October':'10',
        'November':'11',
        'December':'12'
    };
    let tableData = [];
    let hasJanuary = false;
    let hasDecember = false;
    //this will loop through the pages
    for (var pageNum = 0; pageNum < pagesText.length; pageNum++) {
        var pageContent = pagesText[pageNum];
        console.log(pageContent);
        //this will determin the year if + or - 1
        hasJanuary = (hasJanuary || (pageContent.indexOf('January') > -1));
        hasDecember = (hasDecember || (pageContent.indexOf('December') > -1));
        //get year, this should typically be before the transactions
        if(!yearUsed && (pageContent.indexOf('STATEMENT DATE') > -1)){
            yearUsed = pageContent.split('STATEMENT DATE')[1].split(', ')[1].split(' ')[0];
        }
        unbilledTemp = (pageContent.indexOf('Unbilled Installment Amount') > -1);
        if(unbilledTemp){
            unbilledCount++;
        }
        //once it has a true, it's get all the pages moving forward
        enablePageText = enablePageText || unbilledTemp;
        if(enablePageText){
            //skip the first instance
            if(unbilledCount > 1){
                
                let transactionList = (unbilledTemp)?pageContent.split('Unbilled Installment Amount')[1]:pageContent;
                //console.log('Page number:'+pageNum);// each page contents
                //console.log(transactionList);
                //get period between 2 numbers, and use that as indicator of per row
                const reg = /\.(?=\d)/g;
                let perRow = transactionList.split(reg);
                //this will remove the 1st array for the 1st table of transactions
                if(unbilledTemp){
                    perRow.shift();
                }
                //look on each row and process the data
                for(let rowTemp = 0; rowTemp < perRow.length; rowTemp++){
                    let tableRow = {};
                    //Type
                    tableRow['(1)Type'] = 'e';

                    let splitRow = perRow[rowTemp].split(' ');
                    let lastcolumn = splitRow.length - 1;
                    //console.log('splitRow',splitRow);
                    let sequenceCounter = 0;
                    let wordCounter = [];
                    let numberCounter = [];
                    let itemPayee = '';
                    let dateUsed = '';
                    //look at each word, and categorize them by word and number
                    //look for the sequence word then number, twice
                    //after that squence occur, every thing after is itemPayee except the last item, that's the amount
                    for(let temp=0; temp<splitRow.length-1; temp++){//don't include the last item
                        if(sequenceCounter != 2){
                            if(splitRow[temp].match(/^[A-Za-z]+$/) != null){// this is a word
                                wordCounter.push(splitRow[temp]);
                                if(wordCounter.length > 1){
                                    wordCounter = [];
                                    numberCounter = [];
                                    sequenceCounter = 0;
                                    wordCounter.push(splitRow[temp]);
                                }
                            }else if(splitRow[temp].match(/^[0-9]+$/) != null){//number
                                numberCounter.push(splitRow[temp]);
                                if(wordCounter.length < 1){
                                    wordCounter = [];
                                    numberCounter = [];
                                    sequenceCounter = 0;
                                }
                            }
                        }else{
                            itemPayee += splitRow[temp]+' ';
                        }
                        //console.log('temp',temp,sequenceCounter,wordCounter.length,numberCounter.length,splitRow[temp]);
                        //evaluate sequence
                        if(wordCounter.length == 1 && numberCounter.length == 1){
                            sequenceCounter++;
                            if(sequenceCounter == 1){
                                let yearToSave = yearUsed;
                                if(hasJanuary && hasDecember){
                                    if(wordCounter[0] == 'December'){
                                        yearToSave--;
                                    }
                                }
                                //Date Logic
                                tableRow['(2)Date'] = months[wordCounter[0]]+'/'+numberCounter[0]+'/'+yearToSave+' 00:00';
                            }
                            wordCounter = [];
                            numberCounter = [];
                        }
                    }
                    //Item or Payee Logic
                    tableRow['(3)Item or Payee'] = itemPayee.substring(0, itemPayee.length - 1);
                    //console.log('AMount',(rowTemp-1) >= 0);
                    if((rowTemp+1) < perRow.length){
                        tableRow['(4)Amount'] = splitRow[splitRow.length-1]+'.'+perRow[rowTemp+1].split(' ')[0];
                    }
                    //(5)Parent Category logic
                    tableRow['(5)Parent Category'] = 'OTHERS';
                    //(6)Category logic
                    tableRow['(6)Category'] = 'Others';
                    //(7)Account Type logic
                    tableRow['(7)Account Type'] = 'BANK';
                    //(8)Account logic
                    tableRow['(8)Account'] = 'BPI - Savings 2';
                    //(9)Notes logic
                    tableRow['(9)Notes'] = '';
                    //(10)Label logic
                    tableRow['(10)Label'] = 'BPI CC';
                    //(11)Status logic
                    tableRow['(11)Status'] = '';
                    //(12)Split logic
                    tableRow['(12)Split'] = '';
                    console.log(tableRow);
                    if(itemPayee){
                        tableData.push(tableRow);
                    }
                }
            }
        }
    }
    //console.log(tableData);
    createTable(tableData);
}
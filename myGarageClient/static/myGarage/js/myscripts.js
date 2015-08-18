var maxResults = 10;

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

var activeBtnState = {};
activeBtnState.newRowNeeded = false;


// when one of the section buttons gets clicked
function setButtonActive(elem) {
    if ($('.sectionsButton.active')[0] !== elem) {
        deactivateButtons();
        $(elem).addClass('active');
        removeTable();
        prepareTable();
    }
}

// before activating a new button, we have to deactivate the last one
function deactivateButtons() {
    var buttons = $('.sectionsButton');
    $.each(buttons, function(){
        if($(this).hasClass("active")) {
            $(this).removeClass("active");
            return false;
        }
    });
}

// this gets called as soon as the page loads
// and it populates the cars select box
function getUserCars() {
    var carNum = 0;
    $.ajax({type:"GET", url: "/api/v1/cars/"})
        .fail(function(resp){
            console.log(resp.responseText);
        })
        .done(function(resp){
            carNum = resp.count;
            var options = $('#userCarsSelectBox');
            $.each(resp.results, function() {
                options.append($("<option />").val(this.pk).text(this.manufacturer_name+" "+this.model_name));
            });
            if(carNum > 1) {
                $('#carNum').text('My cars');
            } else {
                $('#carNum').text('My car');
            }

            $('#refuellingsButton').addClass('active');
            prepareTable();
        });
}

// check what section button has the active class
// generate table for that section
function prepareTable() {
    $('#contentBody').hide();
    $('#emptyBody').hide();
    $('.pagination').hide();
    activeBtnState.page = 1;
    getTableColumns(getActiveSectionName());
}

function getActiveSectionName() {
    var sectionBtn = $('.sectionsButton.active');
    var sectionID = $(sectionBtn).attr('id');
    var index = sectionID.indexOf("Button");
    return sectionID.substring(0, index).toLowerCase();
}

// gets the records for the selected section
function getTableRecords(sectionName, url) {
    var req_url = url ? url : "/api/v1/" + sectionName + "/";
    $.ajax({type:"GET", url: req_url})
        .fail(function(resp){
            console.log(resp.responseText);
        })
        .done(function(resp){
            activeBtnState.sectionName = sectionName;
            activeBtnState.numOfRecords = resp.count;
            activeBtnState.results = resp.results;
            activeBtnState.numOfPages = Math.ceil(activeBtnState.numOfRecords / maxResults);
            activeBtnState.nextPage = resp.next;
            activeBtnState.previous = resp.previous;
            activeBtnState.page = activeBtnState.page || 1;
            renderPagination();
            addTableBody();
        });
}

function getLastPaginationBtn() {
    var lastBtn = $('.pagination').find('li').last().children();
    return lastBtn;
}

function renderPagination() {
    var pagination = $('#pagination-ul');
    pagination.find('li').each(function(index, elem) { $(elem).remove() });

    for (var i = 1; i <= activeBtnState.numOfPages; i++) {
        pagination.append('<li><a href="#">' + i +'</a></li>');
        if (parseInt(activeBtnState.page) === i) {
            pagination.find('li:nth-child(' + i + ')').addClass('active');
        }
    }
    pagination.find("li a").click(paginationBtnClickHandler);
}

function paginationBtnClickHandler() {
    var sectionName = getActiveSectionName(),
        url = "/api/v1/" + sectionName;
    removeTableRows();
    $('.pagination').hide();
    getTableRecords(sectionName, url + '/?page=' + $(this).text());
    activeBtnState.page = $(this).text();
}


// gets the columns for the selected section
function getTableColumns(sectionName) {
    var sectionSingular;
    if(sectionName === "taxes") {
        sectionSingular = sectionName.substring(0, sectionName.length - 2);
    }
    else {
        sectionSingular = sectionName.substring(0, sectionName.length - 1);
    }
    $.ajax({type:"GET", url: "/api/v1/columns/"+sectionSingular+"/"})
        .fail(function(resp){
            console.log(resp.responseText);
        })
        .done(function(resp){
            activeBtnState.numOfColumns = resp.length - 2;
            activeBtnState.columns = resp;
            addTableHead();
            getTableRecords(sectionName);
    });
}

// this builds the table's head
function addTableHead() {
    $('#tableRecords thead').append($('<tr>'));
    var tableHead = $('#tableRecords thead').find('tr');
    for(var column in activeBtnState.columns) {
        var columnName = getTableHeadName(activeBtnState.columns[column]);
        if(columnName === "Id" || columnName === "Car") {
            continue;
        }
        $(tableHead).append($('<th>').text(columnName));
    }
    $(tableHead).append($('<th>').css({'width': '70px'})); // this is the column that holds the operations buttons
    setTableCellsWidth(tableHead,  $('#garageContent').width(), true);
}

// this builds the table's body
function addTableBody() {
    enableAddNewRecordBtn();
    if(activeBtnState.numOfRecords > 0){ // there are records for this section
         var noRecordsMsg = "";
         var carHasRecords = false;
         $.each(activeBtnState.results, function(index, elem) {
             var pk;
             var tableContainerWidth = $('#garageContent').width();
             $('#contentBody').append($('<tr>'));

             var newRow = $('#contentBody').find('tr').last();
             for (var key in elem) {
                 if(key === "pk") {
                    pk = elem[key];
                    //$(newRow).append($('<input>').attr("name", key).attr("id", "hiddenValue").val(pk));
                    continue;
                 }
                 if(key === "car") {
                      if(!isSelectedCar(elem[key])) { // this record belongs to another car
                          if(!carHasRecords && index === (activeBtnState.results.length - 1)) {
                              // this combination of section and car doesn't have any records
                              noRecordsMsg = 'You have no '+activeBtnState.sectionName+' added for this car!';
                              setNoRecordsBody(newRow, noRecordsMsg);
                          }
                          return; // skip to the next record
                      }
                      carHasRecords = true;
                      continue;
                 }
                 $(newRow).append($('<td>')
                          .append($('<input>')
                               .prop('type', 'text')
                               .attr('name', key)
                               .val(elem[key])
                          ));
             }
             $(newRow).append($('<span>').attr('id', "hiddenValue").text(pk));
             addOperationsButtons(newRow);

             setTableCellsWidth(newRow, tableContainerWidth, false);

         });

        // here we remove the table row/rows added and not populated
        // because the corresponding record/records belong/s to another car (the user has more than one car)
        $('#contentBody tr').each(function(index, elem){
                if($(elem).children().length == 0) {
                    $(elem).remove();
                }
        });

         if(!noRecordsMsg) { // we have records for the selected section and car
            arrangeTableForMinHeight();
         }
         $('#contentBody').show();

    }
    else { // there are no records for this section
         $('#emptyBody').append($('<tr>'));
         var newRow = $('#emptyBody').find('tr').last();
         var message = 'You have no ' + activeBtnState.sectionName + ' added yet!';
         setNoRecordsBody(newRow, message);
    }

    var rows = $('#contentBody>tr');
    rows.on('click', markSelectedRecord);

    $('#tableRecords').show();
    setAddNewRecordBtn();
    $("#addNewRecordBtn").prop('disabled', false);
    $('.pagination').show();
    if(activeBtnState.newRowNeeded) {
        // addTableBody() function was called because user requested a new record on a full pagination
        addNewRecord();
    }
}

function setTableCellsWidth(newRow, tableContainerWidth, isTableHead) {
    var tableCell;
    if (isTableHead) {
        tableCell = $('th');
    } else {
         tableCell = $('td');
    }

    var leftPadding = tableCell.css('padding-left');
    var rightPadding = tableCell.css('padding-right');
    var widthPadding = parseInt(leftPadding.charAt(0)) + parseInt(rightPadding.charAt(0));
    var cellWidth = (tableContainerWidth - 70)/activeBtnState.numOfColumns-(widthPadding + 1);
    $(newRow).find('input').css({"width": cellWidth});
}

// here we add an extra tbody that holds an 'empty space'
// the purpose is to make up for the difference between the min height of the table body (150px) and
// the height that the table would have with only 2-3 rows
function arrangeTableForMinHeight() {
    var contentBodyHeight = $("#contentBody tr").length * ($('#contentBody tr').height()+2); // 2 is the sum of tr's border-top + boder-bottom
    if(contentBodyHeight < 150){
        var emptySpace = 150 - contentBodyHeight;
        $("#emptyBody").append($('<tr>').attr('id', 'emptySpaceRow')
                            .append($('<td>').attr('colspan', activeBtnState.numOfColumns + 1)
                                .append($('<div>')
                                    .attr('id', 'emptyDiv'))));
        $("#emptyDiv").height(emptySpace);
        $('#emptyBody').show();
    }
}

// adds the button responsible for adding a new row
function setAddNewRecordBtn() {
    var tableHeight = $('#tableRecords').height();
    var marginTop = 15 + tableHeight + "px";
    $('#addNewRecordBtn').css({'top': marginTop});
    $('#addNewRecordBtn').css({'visibility': 'visible'});
    $("#coverDiv").css({'top': marginTop});
}

function removeAddNewRecordBtn() {
    $('#addNewRecordBtn').css({'visibility': 'hidden'});
}

// this function is called when the user wants to add a new record to the table
function addNewRecord() {
    $('#contentBody').show();
    $('#emptyBody').show();
    activeBtnState.newRowNeeded = false;
    var numOfRowsOnPage = $('#contentBody > tr').length;
    if(numOfRowsOnPage === 10) {
        var lastPaginationBtn = getLastPaginationBtn();
        activeBtnState.newRowNeeded = true;
        paginationBtnClickHandler.call(lastPaginationBtn);
    } else {
        disableAddNewRecordBtn();
        removeNoRecordsTD();
        $("#emptyBody").find("#emptySpaceRow").remove();
        $('#contentBody').append($('<tr>'));
        arrangeTableForMinHeight();
        removeAddNewRecordBtn();

        for (var column in activeBtnState.columns) {
            if(activeBtnState.columns[column] == "id" || activeBtnState.columns[column] =="car") { continue; }
            $('#contentBody').find("tr").last().append($("<td>")
                                                    .append($('<input>')
                                                    .prop('type', 'text')
                                                    .attr('name', activeBtnState.columns[column])));
        }

        $('#contentBody').find("tr").last().addClass("temporaryRow");
        addOperationsButtons($('.temporaryRow'));
        setTableCellsWidth($(".temporaryRow"), $('#garageContent').width(), false);
        $('#contentBody').find("tr").last().on('click', markSelectedRecord);
        setAddNewRecordBtn();
    }
}

function changeImgSrcToHover() {
    var imgClass = $(this).attr("class");
    var newImgSrc;
    switch (imgClass) {
        case "saveRowImg":
            newImgSrc = saveImgHoverSrc;
            break;
        case "updateRowImg":
            newImgSrc = updateImgHoverSrc;
            break;
        case "deleteRowImg":
            newImgSrc = deleteImgHoverSrc;
            break;
    }

    $(this).attr("src", newImgSrc);
}

function changeImgSrcToNormal() {
    var imgClass = $(this).attr("class");
    var newImgSrc;
    switch (imgClass) {
        case "saveRowImg":
            newImgSrc = saveImgSrc;
            break;
        case "updateRowImg":
            newImgSrc = updateImgSrc;
            break;
        case "deleteRowImg":
            newImgSrc = deleteImgSrc;
            break;
    }
    $(this).attr("src", newImgSrc);
}

function appendSaveRowImg(parentElement){
    $(parentElement).append($('<img>')
                    .attr("src", saveImgSrc)
                    .addClass("saveRowImg")
                    .click(saveRecord)
                    .hover(changeImgSrcToHover, changeImgSrcToNormal));
}

function replaceSaveRowImg(parentElement) {
    $(parentElement).find(".saveRowImg").remove();
    $( ".temporaryRow .deleteRowImg" ).before( $('<img>')
                        .attr("src", updateImgSrc)
                        .addClass("updateRowImg")
                        .click(updateRecord));
}

function appendUpdateRowImg(parentElement) {
    $(parentElement).append($('<img>')
                        .attr("src", updateImgSrc)
                        .addClass("updateRowImg")
                        .click(updateRecord)
                        .hover(changeImgSrcToHover, changeImgSrcToNormal));
}

function appendDeleteRowImg(parentElement) {
    $(parentElement).append($('<img>')
                    .attr("src", deleteImgSrc)
                    .addClass("deleteRowImg")
                    .click(deleteRecord)
                    .hover(changeImgSrcToHover, changeImgSrcToNormal));
}

// adds an additional column that holds the save and delete row buttons
function addOperationsButtons(newRow ) {
     $(newRow).append($('<td>')
            .css({'width': '70px'})
            .append($('<div>')
                .addClass('rowButtons')));
     if($(newRow).hasClass( "temporaryRow" )){
        appendSaveRowImg($(".rowButtons").last());
     } else {
        appendUpdateRowImg($(".rowButtons").last());
     }
     appendDeleteRowImg($(".rowButtons").last());
}

// set the csrf token before making ajax call
function ajaxSetup() {
    var csrftoken = getCookie('csrftoken');
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    });
}

// mark the record clicked by the user
function markSelectedRecord() {
    if($('#selectedRecord').length !== 0) {
        unmarkSelectedRecord();
    }

    $(this).attr('id', 'selectedRecord');
}

function unmarkSelectedRecord() {
     $("#selectedRecord").removeAttr("id");
}

function getSelectedRecordPk() {
    return $("#selectedRecord").find("#hiddenValue").text();
}

// returns the input data contained by the selected row
function getSelectedRecordData() {
    var columns = $("#selectedRecord").find("td");
    var data = {};
    for (var i = 0; i<columns.length-1; i++){
        var cell = columns[i];
        var cellChildren = $(cell).children();
        //console.log(cellChildren);
        var name = cellChildren.attr("name");
        var value = cellChildren.val();
        data[name] = value;
    }
    //console.log(data);
    return data;
}

function getSelectedCarURL() {
    var selectedCar = $('#userCarsSelectBox').val();
    return "/api/v1/cars/" + selectedCar + "/";
}

function makeRowPermanent(objSaved) {
    $(".temporaryRow").append($('<span>').attr("id", "hiddenValue").text(objSaved.pk));
    replaceSaveRowImg($(".temporaryRow").last());
    $(".temporaryRow").removeClass("temporaryRow");
}

function disableAddNewRecordBtn() {
    $("#addNewRecordBtn").prop('disabled', true);
    $("#coverDiv").show();
}

function enableAddNewRecordBtn() {
     $("#coverDiv").hide();
     $("#addNewRecordBtn").prop('disabled', false);
}

function saveRecord() {
    //console.log("in save record");
    $(this).closest("tr").attr("id", "selectedRecord"); // mark this row as selected
    var section = activeBtnState.sectionName;
    var dataObj = getSelectedRecordData();
    dataObj["car"] = getSelectedCarURL();

    ajaxSetup();
    $.ajax({
              method: "POST",
              url: "/api/v1/" + section + "/",
              contentType : 'application/json',
              data: JSON.stringify(dataObj)
          })
          .done(function( objSaved ) {
              console.log( "Data Saved: " + JSON.stringify(objSaved));
              unmarkSelectedRecord();
              makeRowPermanent(objSaved);
              enableAddNewRecordBtn();
          });
}

function updateRecord() {
    //console.log("in update");
    $(this).closest("tr").attr("id", "selectedRecord"); // mark this row as selected
    var section = activeBtnState.sectionName;
    var pk = getSelectedRecordPk();
    var dataObj = getSelectedRecordData();
    dataObj["car"] = getSelectedCarURL();
    console.log(dataObj);

    ajaxSetup();
    $.ajax({
              method: "PUT",
              contentType : 'application/json',
              url: "/api/v1/" + section + "/" + pk + "/",
              data: JSON.stringify(dataObj)
          })
          .done(function( msg ) {
              console.log( "Data Saved: " + msg );
              unmarkSelectedRecord();
          });
}

function rearrangeTableAfterDeletingRecord() {
      $("#selectedRecord").remove();
      removeAddNewRecordBtn();
      $("#emptyBody").find("#emptySpaceRow").remove();
      arrangeTableForMinHeight();
      setAddNewRecordBtn();
}

function deleteRecord() {
    $(this).closest("tr").attr("id", "selectedRecord"); // mark this row as selected
    var section = activeBtnState.sectionName;
    var pk = getSelectedRecordPk();
    ajaxSetup();
    $.ajax({
              method: "DELETE",
              url: "/api/v1/" + section + "/" + pk + "/"
           })
          .done(function( msg ) {
              console.log( "Data Saved: " + msg );
              rearrangeTableAfterDeletingRecord();
          });
}

// this is called when the user has no records for a certain section and/or car
function setNoRecordsBody(newRow, message) {
    $(newRow).append($('<td>')
        .attr("id", "noRecordsTD")
        .attr('colspan', activeBtnState.numOfColumns+1)
        .append($('<div>')
            .attr('id', 'noRecordsMessage')
            .text(message)));
    $("#emptyBody").show();
}

function removeNoRecordsTD() {
    $("#noRecordsTD").closest("tr").remove();
}


// get table head columns names from the DB column names
function getTableHeadName(key) {
    var res = key.split("_");
    var name ="";
    for (var i=0; i < res.length; i++) {
        if(i === 0) {
            name += res[i].charAt(0).toUpperCase() + res[i].slice(1);
        } else {
            name += " " + res[i];
        }
    }
    return name;
}

// this checks if the car selected by the user matches the current record's car
function isSelectedCar(carUrl) {
    carUrl = String(carUrl);
    var carID = carUrl.charAt(carUrl.length - 2);
    var selectedCar = $('#userCarsSelectBox').val();
    return carID == selectedCar;
}

// this is called when the user selects a different car
function selectCarHandler() {
    removeTable();
    prepareTable();
}

function removeTableRows() {
    $('#tableRecords tbody').find('tr').remove();
}

function removeTable() {
    $('#tableRecords tbody').find('tr').remove();
    $('#tableRecords thead').find('tr').remove();
}

function changeDropDownMenuVisibility(event){
    var display = $("#dropDownMenu").css('display');
    if(display === "none") {
         showDropDownMenu(event);
    } else {
        hideDropDownMenu();
    }
}

function showDropDownMenu(event) {
    doNotCloseDropDownMenu(event);
    $("#dropDownMenu").show();
}

function hideDropDownMenu() {
    $("#dropDownMenu").hide();
}

function doNotCloseDropDownMenu(event) {
    event.stopPropagation();
}

function selectDropDownMenuElement(elem) {
    $(elem).attr("class", "selectedDropDownMenuElement");
}

function deselectDropDownMenuElement(elem) {
    $(elem).removeAttr("class");
}

function onHoverTriangleBtn(elem) {
    $(elem).attr("src", triangleImgHoverSrc);
    $(elem).css({"outline": "1px solid orange"});
    $(elem).mouseleave(function() {
        $(this).attr("src", triangleImgSrc);
        $(this).css({"outline": "1px solid white"});
    });
}
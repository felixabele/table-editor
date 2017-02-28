// Reference: https://tabletag.net/

describe('TableWidget', function () {

  beforeEach(function() {
    var table = `<div id="table"><table class="table">
      <tbody>
        <tr>
          <td>1/1</td>
          <td>1/2</td>
          <td>1/3</td>
          <td>1/4</td>
        </tr>
        <tr>
          <td>2/1</td>
          <td>2/2</td>
          <td>2/3</td>
          <td>2/4</td>
        </tr>
        <tr>
          <td>3/1</td>
          <td>3/2</td>
          <td>3/3</td>
          <td>3/4</td>
        </tr>
      </tbody>
    </table></div>`;
    $(table).appendTo('body');
  });

  afterEach(function() {
    $("#table").remove();
  });

  function colspanCount() {
    var count = 0;

    $('#table th, td').each(function() {
      if ($(this).attr('colspan') == undefined) {
        count += 1;
      } else {
        count += parseInt($(this).attr('colspan'));
      }
    });
    return count;
  };


  it('adds lines and rows', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('addTopRow', 0);
    widget.edit_table('addTopRow', 1);
    widget.edit_table('addLeftCols', 1);
    widget.edit_table('addLeftCols', 1);
    widget.edit_table('renderHtml');

    expect(widget.edit_table('rowCount')).toBe(5);
    expect(widget.edit_table('colCount')).toBe(6);
  });


  it('merges right than bottom', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeRight', 0, 1);
    widget.edit_table('mergeBottom', 0, 1);
    widget.edit_table('renderHtml');

    expect(colspanCount()).toBe(10)
  });


  it('fails merging below row right than above right row bottom', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeRight', 1, 2);
    widget.edit_table('mergeBottom', 0, 3);
    widget.edit_table('renderHtml');

    expect(colspanCount()).toBe(12)
  });

  it('merges right than above left row bottom', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeRight', 1, 1);
    widget.edit_table('mergeBottom', 0, 2);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(11)
  });

  it('merges bottom than merged right into another bottom merged cell', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 2);
    widget.edit_table('mergeBottom', 0, 3);
    widget.edit_table('mergeRight', 0, 2);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });

  it('merges botttom 0/2 and merges bottom 0/3 and merges right 0/2', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 2);
    widget.edit_table('mergeBottom', 0, 3);
    widget.edit_table('mergeRight', 0, 2);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });

  it('merges 0/0-0/1 into 1/1-2/1', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 0);
    widget.edit_table('mergeBottom', 1, 1);
    widget.edit_table('mergeRight', 0, 0);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });

  it('merges 0/0-1/0 into 0/1-1/1', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 0);
    widget.edit_table('mergeBottom', 0, 1);
    widget.edit_table('mergeRight', 0, 0);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });


  it('merges 0/0-1/0 into 0/1 and 1/1', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 0);
    widget.edit_table('mergeRight', 0, 0);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });

  it('fails merging 1/1-1/2 into 2/0-2/1', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeRight', 1, 1);
    widget.edit_table('mergeRight', 2, 0);
    widget.edit_table('mergeBottom', 1, 1);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(10)
  });

  it('merges 1/3 into 1/2-2/2', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 1, 2);
    widget.edit_table('mergeLeft', 1, 3);
    widget.edit_table('renderHtml');

    expect($("#table td, th").length).toBe(9)
  });

  it('merges 0/2 into 1/2 -> 0/2-1/2 left -> 0/0 right', function() {
    var widget = $("#table").edit_table();

    widget.edit_table('mergeBottom', 0, 2);
    widget.edit_table('mergeLeft', 0, 2);
    widget.edit_table('mergeRight', 0, 0);
    widget.edit_table('renderHtml');
    expect($("#table td, th").length).toBe(7)
  });

});

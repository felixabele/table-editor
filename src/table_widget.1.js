$(function() {
  'use strict';

  $.widget("scrivito.edit_table", {

    options: {
      class_name: 'scrivito-table-editor',
      presetContent: '',
      table_classes: {
        'table-striped': 'Striped',
        'table-condensed': 'Condensed',
        'table-hover': 'Hover',
        'table-bordered': 'Border',
        'column-first': 'First',
      },
      cell_actions: {
        cell_styles:    { title: "Styles", icon_class: "pencil" },
        add_row_below:  { title: "Add row below", icon_class: "plus-circle" },
        add_row_top:    { title: "Add Row on Top", icon_class: "plus-circle" },
        add_col_left:   { title: "Add Col Left", icon_class: "plus-circle" },
        add_col_right:  { title: "Add Col Right", icon_class: "plus-circle" },
        merge_left:     { title: "Merge Left", icon_class: "reply" },
        merge_right:    { title: "Merge Right", icon_class: "share" },
        merge_bottom:   { title: "Merge Bottom", icon_class: "share fa-rotate-90" },
        delete_row:     { title: "Delete Row", icon_class: "minus-circle" },
        delete_column:  { title: "Delete Column", icon_class: "minus-circle" },
        split_column:   { title: "Split Column", icon_class: "ellipsis-h" },
      },
      cell_styles: [
        { title: "Align Left", icon_class: "align-left", css: {'text-align': 'left'} },
        { title: "Align Center", icon_class: "align-center", css: {'text-align': 'center'} },
        { title: "Align Right", icon_class: "align-right", css: {'text-align': 'right'} },
      ],
      cell_classes: [
        { title: "No Background", icon_class: "crosshairs", css_class: '' },
        { title: "Background class: success", icon_class: "crosshairs", css_class: 'alert-success' },
        { title: "Background class: info", icon_class: "crosshairs", css_class: 'alert-info' },
        { title: "Background class: warning", icon_class: "crosshairs", css_class: 'alert-warning' },
        { title: "Background class: danger", icon_class: "crosshairs", css_class: 'alert-danger' },
      ],
    },

    matrix: [],
    activeCell: null,
    $contextMenu: null,
    $tableMenu: null,
    $cellStyleMenu: null,
    cellStyles: [],
    keysBound: false,

    _activeColumn: function() {
      var table = this;
      return table.matrix.map(
        function(row) { return row[table.activeCell.col_index] }
      );
    },

    _activeRow: function() {
      var table = this;
      return table.matrix[table.activeCell.row_index].map(
        function(cell) { return cell }
      );
    },

    // Initialize
    _create: function() {
      var table = this;

      this.element.addClass(this.options.class_name);
      this.cellStyles = $.unique(this.options.cell_styles.map(function(a) {
        return Object.keys(a.css)[0]
      }));

      if (this.element.find('table').length) {
        this.parseHtml();
      } else {
        this.matrix = [[table.newCell({})]];
      }

      this._createContextMenu();
      this._createTableMenu();
      this._createCellStyleMenu();

      this.renderHtml();
      this._reloadTableClasses();

      $(window).resize(function() {
        if (table.activeCell)
          table._attachMenuToCell(table.activeCell);
      });

      if(!this.keysBound) {
        this._bindKeys();
      }
    },

    _createCellStyleMenu: function() {
      var table = this;
      this.$cellStyleMenu = $('<div>').hide();
      this.$cellStyleMenu.attr('id', 'table_editor_cell_styles');
      this.element.append(this.$cellStyleMenu);

      var createBtn = function(icon, title) {
        var btn = $('<a>').addClass('btn btn-xs').attr('title', title);
        table.$cellStyleMenu.append(btn);
        return btn.append($('<i>').addClass('fa fa-'+ icon));
      }

      $.each(this.options.cell_styles, function(_, properties) {
        var $styleBtn = createBtn(properties.icon_class, properties.title);
        $styleBtn.on('click', function() {
          table.addCellStyle(table.activeCell, properties.css);
        });
      });

      $.each(this.options.cell_classes, function(_, properties) {
        var $styleBtn = createBtn(properties.icon_class, properties.title);
        $styleBtn.addClass(properties.css_class);
        $styleBtn.on('click', function() {
          table.addCellClass(table.activeCell, properties.css_class);
        });
      });
    },

    _createContextMenu: function() {
      var table = this;

      table.$contextMenu = $('<div>').attr('id', 'table_editor_cell_menu').hide();
      table.element.before(this.$contextMenu);

      $.each(this.options.cell_actions, function(action, opt) {
        var $btn = $('<a>')
          .addClass(action)
          .attr({ 'data-action': action, 'title': opt.title });

        $btn.append($('<i>').addClass('fa fa-'+ opt.icon_class));
        table.$contextMenu.append($btn);
      });
    },

    _createTableMenu: function() {
      var table = this,
          $editBtn = $('<a>')
            .addClass('btn btn-primary btn-xs table-editor-toggle-menu')
            .append($('<i>').addClass('fa fa-paint-brush')),
          $addBtnGroup = $('<div>').addClass('table-editor-btn-group').hide(),
          $addClassBtn = $('<a>').addClass('btn btn-xs').data('action', 'add_class');

      table.$tableMenu = $('<div>').attr('id', 'table_editor_table_menu').addClass('clearfix')
      table.$tableMenu.append($editBtn);
      table.$tableMenu.append($addBtnGroup);

      $editBtn.on('click', function(e) {
        e.preventDefault();
        $addBtnGroup.toggle();
      });

      $.each(table.options.table_classes, function(cssClass, label) {
        var $btnEl = $addClassBtn.clone().data('value', cssClass).html(label);
        $btnEl.on('click', function() {
          table.element.find('table').toggleClass(cssClass);
          table._reloadTableClasses();
          table._triggerUpdate();
        });
        $addBtnGroup.append($btnEl);
      });

      table.element.prepend(this.$tableMenu);
    },

    _reloadTableClasses: function() {
      var $table = this.element.find('table');
      this.$tableMenu.find('a').each(function() {
        if ($table.hasClass($(this).data('value')))
          $(this).removeClass('btn-default').addClass('btn-success');
        else
          $(this).removeClass('btn-success').addClass('btn-default');
      });
    },

    _attachMenuToCell: function(cell) {
      if (cell == undefined) return;

      this.$contextMenu.css({
        width: cell.element.outerWidth(),
        height: cell.element.outerHeight(),
      });
      this.$contextMenu.position({
        my: "left top",
        at: "left top",
        of: cell.element
      });
    },

    _onCellActionClick: function(cell) {
      if (!cell.element.hasClass('highlight')) {
        this.activeCell = cell;
        this.element.find('td, th').removeClass('highlight');
        cell.element.addClass('highlight');

        this.$contextMenu.unbind('click');
        this._initClickHandler();
        this._initHighlightHandler();
        this.$contextMenu.show();
        this._attachMenuToCell(cell);
        this.$cellStyleMenu.hide();

        this.$contextMenu.find('a.merge_right').toggle( !this._isLastVisibleCell(cell.row_index, cell.col_index));
        this.$contextMenu.find('a.merge_left').toggle(!this._isFirstVisibleCell(cell.row_index, cell.col_index));
        this.$contextMenu.find('a.merge_bottom').toggle(!this._isLastVisibleRow(cell.row_index, cell.col_index));
        this.$contextMenu.find('a.delete_row').toggle((this.rowCount() > 1) && this._canDeleteRow());
        this.$contextMenu.find('a.delete_column').toggle((this.colCount() > 1) && this._canDeleteColumn());
        this.$contextMenu.find('a.split_column').toggle((cell.colspan > 1) || (cell.rowspan > 1));
      }
    },

    _initClickHandler: function() {
      var table = this;
      var events = {
        cell_styles:    function() { table._showCellStyleMenu() },
        add_row_below:  function() { table.addBottomRow(table.activeCell.row_index, table.activeCell.col_index) },
        add_row_top:    function() { table.addTopRow(table.activeCell.row_index) },
        add_col_left:   function() { table.addLeftCols(table.activeCell.col_index) },
        add_col_right:  function() { table.addRightCols(table.activeCell.col_index) },
        merge_right:    function() { table.mergeRight(table.activeCell.row_index, table.activeCell.col_index) },
        merge_left:     function() { table.mergeLeft(table.activeCell.row_index, table.activeCell.col_index) },
        merge_bottom:   function() { table.mergeBottom(table.activeCell.row_index, table.activeCell.col_index) },
        delete_row:     function() { table.deleteRow(table.activeCell.row_index) },
        delete_column:  function() { table.deleteColumn(table.activeCell.col_index) },
        split_column:   function() { table.splitColumn(table.activeCell.row_index, table.activeCell.col_index) },
      }

      this.$contextMenu.on('click', 'a', function(e) {
        e.preventDefault();
        var action = $(this).data('action');
        events[action]();

        if (action != 'cell_styles')
          table.renderHtml();
      });
    },

    _highlightColumn: function(cl) {
      $.each(this._activeColumn(), function() {
        if ((this != undefined) && (this.element != undefined))
          this.element.addClass(cl);
      })
    },

    _showCellStyleMenu: function() {
      if (this.$cellStyleMenu.is(':visible')) {
        this.$cellStyleMenu.hide();
      } else {
        var posi = this.activeCell.element.position();
        this.$cellStyleMenu.css({ left: (posi.left+20) +'px', top: (posi.top-20) +'px' });
        this.$cellStyleMenu.show();
      }
    },

    _initHighlightHandler: function() {
      var table = this;

      var handleMergeBottom = function() {
        var target = table._getVisibleCellInNextRow(table.activeCell.row_index, table.activeCell.col_index);
        $.each(table.activeCell.allCells(), function(_, cell) {
          table.matrix[target.row_index][cell.col_index].element.addClass('highlight-merge');
        });
      }

      var handleMergeRight = function() {
        var targets = table.mergeRightTargets(table.activeCell.row_index, table.activeCell.col_index);
        $.each(targets, function() {
          this.element.addClass('highlight-merge');
        });
      }

      var handleMergeLeft = function() {
        var target = table.matrix[table.activeCell.row_index][table.activeCell.col_index-1];
        $.each(table.activeCell.allCells(), function(_, cell) {
          table.matrix[cell.row_index][target.col_index].element.addClass('highlight-merge');
        });
      }

      var events = {
        cell_styles:    function() { },
        add_row_below:  function() { table.activeCell.row_element.addClass('highlight-bottom') },
        add_row_top:    function() { table.activeCell.row_element.addClass('highlight-top') },
        merge_right:    handleMergeRight,
        merge_left:     handleMergeLeft,
        merge_bottom:   handleMergeBottom,
        delete_row:     function() { table.activeCell.row_element.addClass('highlight-delete') },
        add_col_left:   function() { table._highlightColumn('highlight-left') },
        add_col_right:  function() { table._highlightColumn('highlight-right') },
        delete_column:  function() { table._highlightColumn('highlight-delete') },
        split_column:   function() { },
      };

      this.$contextMenu.find('a')
        .mouseenter(function() {
          events[$(this).data('action')]();
        })
        .mouseleave(function() {
          table.element.find('tr').removeClass('highlight-bottom highlight-top highlight-merge highlight-delete');
          table.element.find('td, th').removeClass('highlight-left highlight-right highlight-merge highlight-delete');
        });
    },

    _isLastVisibleCell: function(row_index, col_index) {
      return this._getNextVisibleCell(row_index, col_index) == undefined;
    },

    _isFirstVisibleCell: function(row_index, col_index) {
      return this._getPreviousVisibleCell(row_index, col_index) == undefined;
    },

    _isLastVisibleRow: function(row_index, col_index) {
      return this._getVisibleCellInNextRow(row_index, col_index) == undefined;
    },

    _getNextVisibleCell: function(row_index, col_index) {
      if ((this.matrix[row_index].length-1) == col_index)
        return undefined;

      for (var i=(col_index+1); i<this.matrix[row_index].length; i++) {
        if (this.matrix[row_index][i].isVisible()) {
          return this.matrix[row_index][i];
        }
      }
      return undefined;
    },

    _getPreviousVisibleCell: function(row_index, col_index) {
      if (col_index == 0) return undefined;

      for (var i=(col_index-1); i>=0; i--) {
        if (this.matrix[row_index][i].isVisible())
          return this.matrix[row_index][i];
      }
      return undefined;
    },

    _getVisibleCellInNextRow: function(row_index, col_index) {
      if ((this.matrix.length-1) == row_index)
        return undefined;

      var cell = this.matrix[row_index][col_index];

      if ((row_index+cell.rowspan) == this.matrix.length)
        return undefined

      var nextRowCell = this.matrix[row_index+cell.rowspan][col_index]

      if (nextRowCell.isVisible()) {
        return nextRowCell;
      } else {
        return nextRowCell.mergedBy;
      }
    },

    // disable delete-column if cells in the column had been merged
    _canDeleteColumn: function() {
      return this._activeColumn().filter(function(cell) {
        return cell.colspan != 1
      }).length == 0
    },

    // disable delete-row if cells in the row had been merged
    _canDeleteRow: function() {
      return this._activeRow().filter(function(cell) {
        return cell.rowspan != 1
      }).length == 0
    },

    _bindKeys: function() {
      var table = this;
      $('body').keyup(function(e) {
        table._triggerUpdate();
        table._attachMenuToCell(table.activeCell);
      });
      this.keysBound = true;
    },

    _triggerUpdate: function() {
      this._trigger('update', null, { html: this.getCleanTableHtml() });
    },

    _deselectCell: function() {
      if (this.activeCell != null) {
        this.activeCell.element.removeClass('highlight');
        this.activeCell = null;
      }
    },

    _destroy: function() {
      this.matrix = [];
      this.element.find('td, th').unbind('click');
      this._deselectCell();
      this.$contextMenu.remove();
      this.$tableMenu.remove();
      this.$cellStyleMenu.remove();
    },

    getCleanTableHtml: function() {
      var $cleanData = this.element.clone();
      $cleanData.find('#table_editor_cell_menu').remove();
      $cleanData.find('#table_editor_table_menu').remove();
      $cleanData.find('#table_editor_cell_styles').remove();
      $cleanData.find('.highlight').removeClass('highlight');
      $cleanData.find('table').removeAttr('data-medium-editor-element');
      $cleanData.find('table').removeAttr('medium-editor-index');
      $cleanData.find('table').removeAttr('data-medium-focused');
      $cleanData.find('table').removeAttr('contenteditable');
      var html = $cleanData.html().replace(/  +/g, ' ');
      return html;
    },

    newCell: function(data) {
      var defaults = {
        colspan: 1,
        rowspan: 1,
        content: '',
        style: {},
        css_class: '',
        mergedCells: [],
        mergedBy: null,
        allCells: function() {
          return [this].concat(this.mergedCells);
        },
        isVisible: function() {
          return (this.colspan > 0) && (this.rowspan > 0)
        },

        // number of including cells in one column
        rowIndeces: function() {
          return _.uniq(this.allCells().map(function(cell) { return cell.row_index }));
        },

        // number of including cells in one row
        colIndeces: function() {
          return _.uniq(this.allCells().map(function(cell) { return cell.col_index }));
        }
      };
      return $.extend({}, defaults, data);
    },

    rowCount: function() {
      return this.matrix.length;
    },

    colCount: function() {
      return this.matrix[0].length;
    },

    maxCellCount: function() {
      return Math.max.apply(Math, this.matrix.map(function(row) { return row.length }));
    },

    addLeftCols: function(index) {
      this.addCols(index);
    },

    addRightCols: function(index) {
      this.addCols(index+1);
    },

    addCols: function(new_index) {
      var table = this;
      $.each(this.matrix, function(_, row) {
        if (new_index < 0) {
          new_index = 0;
        } else if (new_index > row.length) {
          new_index = row.length;
        }

        row.splice(new_index, 0, table.newCell({ content: table.options.presetContent }));
      });
    },

    deleteColumn: function(index) {
      $.each(this.matrix, function() {
        this.splice(index, 1);
      });
    },

    addTopRow: function(index) {
      this.addRow(index);
    },

    addBottomRow: function(cell_row_index, cell_col_index) {
      var cell = this.matrix[cell_row_index][cell_col_index]

      // find the highest column in the row and add the new row underneath
      var indeces = this.matrix[cell_row_index].map(function(cell) {
        if (_.isObject(cell.mergedBy)) {
          return cell.mergedBy.mergedCells[cell.mergedBy.mergedCells.length-1].row_index;
        } else if (cell.mergedCells.length)  {
          return cell.mergedCells[cell.mergedCells.length-1].row_index;
        } else {
          return cell.row_index;
        }
      });

      var index = Math.max.apply(Math, indeces);
      this.addRow(index+1);
    },

    addCellStyle: function(cell, style) {
      cell.style = $.extend({}, cell.style, style);
      this.renderHtml();
    },

    addCellClass: function(cell, cssClass) {
      cell.css_class = cssClass;
      this.renderHtml();
    },

    addRow: function(new_index) {
      var cellCount = this.maxCellCount(),
          table = this;

      if (new_index < 0) {
        new_index = 0;
      } else if (new_index > this.matrix.length) {
        new_index = this.matrix.length;
      }

      var cells = Array.apply(null, Array(cellCount)).map(function() {
        return table.newCell({ content: table.options.presetContent });
      })
      this.matrix.splice(new_index, 0, cells);
    },

    deleteRow: function(index) {
      this.matrix.splice(index, 1);
    },

    mergeRightTargets: function(cell_row_index, cell_col_index) {
      var table  = this,
          target = this._getNextVisibleCell(cell_row_index, cell_col_index),
          origin = this.matrix[cell_row_index][cell_col_index];

      return origin.allCells().map(function(cell) {
        return table.matrix[cell.row_index][target.col_index];
      });
    },

    mergeRight: function(cell_row_index, cell_col_index) {
      var target = this.matrix[cell_row_index][cell_col_index+1],
          origin = this.matrix[cell_row_index][cell_col_index];

      if (_.isObject(target.mergedBy))
        target = target.mergedBy;

      // prevent merging if the target column height is greater than the origin
      var origin_indeces = origin.rowIndeces();
      var target_indeces = target.rowIndeces();

      var indeces_differ = _.find(origin_indeces, function(index) {
        return !_.includes(target_indeces, index)
      });

      if (indeces_differ || (origin_indeces.length < target_indeces.length)) return false;

      if (origin.mergedCells.length)
        var outer_right_index = _.first(_.sortBy(origin.mergedCells, ['col_index'])).col_index;
      else
        var outer_right_index = origin.col_index

      this.mergeCell(origin, target);

      // merge following colums in next row
      for (var i=1; i<origin.rowspan; i++) {
        var nextCell = this.matrix[cell_row_index+i][outer_right_index+1];
        origin.mergedCells.push(nextCell);
        nextCell.colspan = 0;
      }
    },

    mergeLeft: function(cell_row_index, cell_col_index) {
      var target = this.matrix[cell_row_index][cell_col_index-1],
          origin = this.matrix[cell_row_index][cell_col_index];

      if (_.isObject(target.mergedBy))
        target = target.mergedBy;

      // prevent merging if the target column height is greater than the origin
      var origin_indeces = origin.rowIndeces();
      var target_indeces = target.rowIndeces();

      var indeces_differ = _.find(origin_indeces, function(index) {
        return !_.includes(target_indeces, index)
      });
      if (indeces_differ || (origin_indeces.length > target_indeces.length)) return false;

      if (origin.mergedCells.length)
        var outer_left_index = _.last(_.sortBy(origin.mergedCells, ['col_index'])).col_index;
      else
        var outer_left_index = origin.col_index

      this.mergeCell(origin, target);

      // merge preceding columns in next row
      for (var i=1; i<origin.rowspan; i++) {
        var prevCell = this.matrix[cell_row_index+i][outer_left_index-1];
        origin.mergedCells.push(prevCell);
        prevCell.colspan = 0;
      }
    },

    mergeBottom: function(cell_row_index, cell_col_index) {
      var table = this,
          target = this._getVisibleCellInNextRow(cell_row_index, cell_col_index),
          origin = this.matrix[cell_row_index][cell_col_index];

      var origin_indeces = origin.colIndeces();
      var target_indeces = target.colIndeces();
      if (origin_indeces.length < target_indeces.length) return false;

      // if the origin cell spans: merge all cells in the line below first
      else if (origin.mergedCells.length > 0) {
        $.each(origin.mergedCells, function(_, mergedCell) {
          var nextCell = table.matrix[target.row_index][mergedCell.col_index];
          table.mergeCell(target, nextCell);
        });
      }

      // if the target cell spans: merge all cells in the line above first
      else if (target.mergedCells.length > 0) {
        $.each(target.allCells(), function(_, mergedCell) {
          var nextCell = table.matrix[origin.row_index][mergedCell.col_index];
          table.mergeCell(origin, nextCell);
        });
      }
      this.mergeRows(origin, target);
    },

    mergeContent: function(origin, target) {
      target.content = target.element.html();
      origin.content = origin.element.html();

      if (origin.content != target.content) {
        origin.content += ' '+ target.content;
        origin.element.html(origin.content);
      }
      target.content = '';
      target.element.html('');
    },

    mergeRows: function(origin, target) {
      if (origin == target) return;
      this.mergeContent(origin, target);
      origin.mergedCells.push(target);
      target.mergedBy = origin;
      origin.rowspan += target.rowspan;
      target.rowspan = 0;
    },

    mergeCell: function(origin, target) {
      if (origin == target) return;
      origin.mergedCells.push(target);
      target.mergedBy = origin;
      this.mergeContent(origin, target);
      origin.colspan++;
      target.colspan--;
    },

    splitColumn: function(cell_row_index, cell_col_index) {
      var table = this;
      var cell = this.matrix[cell_row_index][cell_col_index];

      // restores merged cells
      $.each(cell.mergedCells, function(_, mergedCell) {
        mergedCell.mergedBy = null;
        table.splitColumn(mergedCell.row_index, mergedCell.col_index);
      });
      cell.rowspan = 1;
      cell.colspan = 1;
      cell.mergedCells = [];
    },

    parseHtml: function() {
      var table = this,
          $tableEl = this.element.find('table')

      table.matrix = [];

      $tableEl.find('tr').each(function() {
        var cells = [];

        $(this).find('th,td').each(function() {
          var $cell = $(this),
              cellData = table.newCell({
                colspan: parseInt($cell.attr('colspan')) || 1,
                rowspan: parseInt($cell.attr('rowspan')) || 1,
                content: $cell.html(),
                css_class: $cell.attr('class'),
              });

          $.each(table.cellStyles, function(_, cssProp) {
            cellData.style[cssProp] = $cell.css(cssProp);
          });

          cells.push(cellData);

          // add invisible cells if the cells spans
          for (var i=1; i<cellData.colspan; i++) {
            cells.push(table.newCell({ colspan: 0, rowspan: 0 }));
          }
        });
        table.matrix.push(cells);
      });

      // remove empty lines
      table.matrix = table.matrix.filter(function(row) { return row.length > 0 });
    },

    renderHtml: function() {
      var $tableEl = null,
          table = this;

      this._deselectCell();

      // init new table. Will replace current table in DOM.
      $tableEl = $('<table class="table">');

      $.each(this.matrix, function(row_index, row) {
        var $row_el = $('<tr>');

        $.each(row, function(col_index, cell) {
          if (cell.isVisible()) {
            cell.row_index = row_index;
            cell.col_index = col_index;
            cell.row_element = $row_el;

            if (cell.element != undefined) {
              cell.content = cell.element.html();
            }

            // for testing:
            // cell.content = ' '+ cell.row_index +'/'+ cell.col_index +' ('+ cell.mergedCells.length +') ';

            cell.element = (row_index == 0) ? $('<th>') : $('<td>');
            cell.element.attr('colspan', cell.colspan);
            cell.element.attr('rowspan', cell.rowspan);
            cell.element.attr('class', cell.css_class);

            if (cell.style != undefined)
              cell.element.css(cell.style);

            cell.element.html(cell.content);
            $row_el.append(cell.element);

            // IE fix: It cannot attach events before element is in DOM.
            cell.element.on('click', function() {
              table._onCellActionClick(cell);
            });
          }
        });

        $tableEl.append($row_el);
      });

      if (this.element.find('table').length) {
        this.element.find('table').replaceWith($tableEl);
      } else {
        this.element.append($tableEl);
      }

      this.$contextMenu.hide();
      this.$cellStyleMenu.hide();
      this._triggerUpdate();
    }
  });
});

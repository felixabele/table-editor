$(function() {
  'use strict';

  $.widget("scrivito.edit_table", {

    options: {
      class_name: 'scrivito-table-editor',
      presetContent: 'Content',
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
      return this.matrix.map((row) => { return row[this.activeCell.col_index] });
    },

    // Initialize
    _create: function() {
      this.element.addClass(this.options.class_name);
      this.cellStyles = $.unique(this.options.cell_styles.map((a) => {
        return Object.keys(a.css)[0]
      }));

      if (this.element.find('table').length) {
        this.parseHtml();
      } else {
        this.matrix = [[{ colspan: 1, rowspan: 1, content: '' }]];
      }

      this._createContextMenu();
      this._createTableMenu();
      this._createCellStyleMenu();

      this.renderHtml();
      this._reloadTableClasses();

      $(window).resize(() => {
        if (this.activeCell)
          this._attachMenuToCell(this.activeCell);
      });

      if(!this.keysBound) {
        this._bindKeys();
      }
    },

    _createCellStyleMenu: function() {
      this.$cellStyleMenu = $('<div>').hide();
      this.$cellStyleMenu.attr('id', 'table_editor_cell_styles');
      this.element.append(this.$cellStyleMenu);

      function createBtn(icon, title, $cellStyleMenu) {
        const btn = $('<a>').addClass('btn btn-xs').attr('title', title);
        $cellStyleMenu.append(btn);
        return btn.append($('<i>').addClass(`fa fa-${icon}`));
      };

      $.each(this.options.cell_styles, (_, properties) => {
        const $styleBtn = createBtn(properties.icon_class, properties.title, this.$cellStyleMenu);
        $styleBtn.on('click', (e) => {
          this.addCellStyle(this.activeCell, properties.css);
        });
      });

      $.each(this.options.cell_classes, (_, properties) => {
        const $styleBtn = createBtn(properties.icon_class, properties.title, this.$cellStyleMenu);
        $styleBtn.addClass(properties.css_class);
        $styleBtn.on('click', (e) => {
          this.addCellClass(this.activeCell, properties.css_class);
        });
      });
    },

    _createContextMenu: function() {
      this.$contextMenu = $('<div>').attr('id', 'table_editor_cell_menu').hide();
      this.element.append(this.$contextMenu);

      $.each(this.options.cell_actions, (action, opt) => {
        const $btn = $('<a>')
          .addClass(action)
          .attr({ 'data-action': action, 'title': opt.title });

        $btn.append($('<i>').addClass(`fa fa-${opt.icon_class}`));
        this.$contextMenu.append($btn);
      });
    },

    _createTableMenu: function() {
      const $editBtn = $('<a>')
        .addClass('btn btn-primary btn-xs table-editor-toggle-menu')
        .append($('<i>').addClass('fa fa-paint-brush'));
      const $addBtnGroup = $('<div>').addClass('table-editor-btn-group').hide();
      const $addClassBtn = $('<a>').addClass('btn btn-xs').data('action', 'add_class');

      this.$tableMenu = $('<div>').attr('id', 'table_editor_table_menu').addClass('clearfix');
      this.$tableMenu.append($editBtn);
      this.$tableMenu.append($addBtnGroup);

      $editBtn.on('click', (e) => {
        e.preventDefault();
        $addBtnGroup.toggle();
      });

      $.each(this.options.table_classes, (cssClass, label) => {
        const $btnEl = $addClassBtn.clone().data('value', cssClass).html(label);
        $btnEl.on('click', (e) => {
          this.element.find('table').toggleClass(cssClass);
          this._reloadTableClasses();
          this._triggerUpdate();
        });
        $addBtnGroup.append($btnEl);
      });

      this.element.prepend(this.$tableMenu);
    },

    _reloadTableClasses: function() {
      const $table = this.element.find('table');
      this.$tableMenu.find('a').each(function() {
        if ($table.hasClass($(this).data('value')))
          $(this).removeClass('btn-default').addClass('btn-success');
        else
          $(this).removeClass('btn-success').addClass('btn-default');
      });
    },

    _attachMenuToCell: function(cell) {
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

        this.$contextMenu.find('a.merge_right').toggle(
          !this._isLastVisibleCell(cell.row_index, cell.col_index)
        );

        this.$contextMenu.find('a.merge_left').toggle(
          !this._isFirstVisibleCell(cell.row_index, cell.col_index)
        );

        this.$contextMenu.find('a.delete_row').toggle(this.rowCount() > 1);
        this.$contextMenu.find('a.delete_column').toggle((this.colCount() > 1) && this._canDeleteColumn());
        this.$contextMenu.find('a.split_column').toggle(cell.colspan > 1);
      }
    },

    _initClickHandler: function() {
      const events = {
        cell_styles:    () => { this._showCellStyleMenu() },
        add_row_below:  () => { this.addBottomRow(this.activeCell.row_index) },
        add_row_top:    () => { this.addTopRow(this.activeCell.row_index) },
        add_col_left:   () => { this.addLeftCols(this.activeCell.col_index) },
        add_col_right:  () => { this.addRightCols(this.activeCell.col_index) },
        merge_right:    () => { this.mergeRight(this.activeCell.row_index, this.activeCell.col_index) },
        merge_left:     () => { this.mergeLeft(this.activeCell.row_index, this.activeCell.col_index) },
        delete_row:     () => { this.deleteRow(this.activeCell.row_index) },
        delete_column:  () => { this.deleteColumn(this.activeCell.col_index) },
        split_column:   () => { this.splitColumn(this.activeCell) },
      }

      this.$contextMenu.on('click', 'a', (e) => {
        e.preventDefault();
        const action = $(e.currentTarget).data('action');
        events[action]();

        if (action != 'cell_styles')
          this.renderHtml();
      });
    },

    _highlightColumn: function(cl) {
      $.each(this._activeColumn(), function() {
        if (this != undefined)
          this.element.addClass(cl);
      })
    },

    _showCellStyleMenu: function() {
      if (this.$cellStyleMenu.is(':visible')) {
        this.$cellStyleMenu.hide();
      } else {
        const posi = this.activeCell.element.position();
        this.$cellStyleMenu.css({ left: `${(posi.left+20)}px`, top: `${(posi.top-20)}px` });
        this.$cellStyleMenu.show();
      }
    },

    _initHighlightHandler: function() {
      const events = {
        cell_styles:    () => { },
        add_row_below:  () => { this.activeCell.row_element.addClass('highlight-bottom') },
        add_row_top:    () => { this.activeCell.row_element.addClass('highlight-top') },
        merge_right:    () => { this.activeCell.element.next().addClass('highlight-merge') },
        merge_left:     () => { this.activeCell.element.prev().addClass('highlight-merge') },
        delete_row:     () => { this.activeCell.row_element.addClass('highlight-delete') },
        add_col_left:   () => { this._highlightColumn('highlight-left') },
        add_col_right:  () => { this._highlightColumn('highlight-right') },
        delete_column:  () => { this._highlightColumn('highlight-delete') },
        split_column:   () => { },
      };

      this.$contextMenu.find('a')
        .mouseenter(function() {
          events[$(this).data('action')]();
        })
        .mouseleave((e) => {
          this.element.find('tr').removeClass('highlight-bottom highlight-top highlight-merge highlight-delete');
          this.element.find('td, th').removeClass('highlight-left highlight-right highlight-merge highlight-delete');
        });
    },

    _isLastVisibleCell: function(row_index, col_index) {
      return this._getNextVisibleCell(row_index, col_index) == undefined;
    },

    _isFirstVisibleCell: function(row_index, col_index) {
      return this._getPreviousVisibleCell(row_index, col_index) == undefined;
    },

    _getNextVisibleCell: function(row_index, col_index) {
      const column_index = col_index;
      if ((this.matrix[row_index].length-1) == column_index)
        return undefined;

      for (let i=(column_index+1); i<this.matrix[row_index].length; i++) {
        if (this.matrix[row_index][i].colspan > 0) {
          return this.matrix[row_index][i];
        }
      }
      return undefined;
    },

    _getPreviousVisibleCell: function(row_index, col_index) {
      const column_index = col_index;
      if (column_index == 0) return undefined;

      for (let i=(column_index-1); i>=0; i--) {
        if (this.matrix[row_index][i].colspan > 0)
          return this.matrix[row_index][i];
      }
      return undefined;
    },

    // disable delete-column if cells in the column had been merged
    _canDeleteColumn: function() {
      return this._activeColumn().filter((cell) => {
        return cell.colspan != 1
      }).length == 0
    },

    _bindKeys: function() {
      $('body').keyup((e) => {
        this._triggerUpdate();
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
      const $cleanData = this.element.clone();
      $cleanData.find('#table_editor_cell_menu').remove();
      $cleanData.find('#table_editor_table_menu').remove();
      $cleanData.find('#table_editor_cell_styles').remove();
      $cleanData.find('.highlight').removeClass('highlight');
      return $cleanData.html();
    },

    rowCount: function() {
      return this.matrix.length;
    },

    colCount: function() {
      return this.matrix[0].length;
    },

    maxCellCount: function() {
      const rowLengths = this.matrix.map((row) => { return row.length });
      return Math.max.apply(Math, rowLengths);
    },

    addLeftCols: function(index) {
      this.addCols(index);
    },

    addRightCols: function(index) {
      this.addCols(index+1);
    },

    addCols: function(new_index) {
      const index = new_index;

      $.each(this.matrix, (_, row) => {
        if (index < 0) {
          index = 0;
        } else if (index > row.length) {
          index = row.length;
        }

        row.splice(index, 0, { colspan: 1, rowspan: 1, content: this.options.presetContent });
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

    addBottomRow: function(index) {
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
      const cellCount = this.maxCellCount(),
            index = new_index;

      if (index < 0) {
        index = 0;
      } else if (index > this.matrix.length) {
        index = this.matrix.length;
      }

      const cells = Array.apply(null, Array(cellCount)).map(() => {
        return { colspan: 1, rowspan: 1, content: this.options.presetContent };
      })
      this.matrix.splice(index, 0, cells);
    },

    deleteRow: function(index) {
      this.matrix.splice(index, 1);
    },

    mergeRight: function(cell_row_index, cell_col_index) {
      this.mergeCells(
        this.matrix[cell_row_index][cell_col_index],
        this._getNextVisibleCell(cell_row_index, cell_col_index)
      );
    },

    mergeLeft: function(cell_row_index, cell_col_index) {
      this.mergeCells(
        this.matrix[cell_row_index][cell_col_index],
        this._getPreviousVisibleCell(cell_row_index, cell_col_index)
      );
    },

    mergeCells: function(origin, target) {
      if (origin.content != target.content) {
        origin.content += ' '+ target.content;
        origin.element.html(origin.content);
      }
      target.content = '';
      target.element.html('');
      origin.colspan++;
      target.colspan--;
    },

    splitColumn: function(cell) {
      const row = this.matrix[cell.row_index];

      function restoreClosestCell(offset) {
        const neighbour = row[cell.col_index+offset];
        if ((neighbour != undefined) && neighbour.colspan == 0) {
          neighbour.colspan++;
          return true;
        } else {
          return false;
        }
      }

      // checks all neighboring cells if they had been merged
      let offset = 1;
        while (offset < row.length) {
          if (restoreClosestCell(offset) || restoreClosestCell(offset*(-1))) {
            cell.colspan--;
            break;
          } else {
            offset++;
          }
        }
    },

    parseHtml: function() {
      const $tableEl = this.element.find('table');

      this.matrix = [];

      $tableEl.find('tr').each((_, tr) => {
        const cells = [];

        $(tr).find('th,td').each((_, cell) => {
          const $cell = $(cell),
              cellStyle = {};

          $.each(this.cellStyles, function(_, cssProp) {
            cellStyle[cssProp] = $cell.css(cssProp);
          });
          cells.push({
            colspan: parseInt($cell.attr('colspan')) || 1,
            rowspan: parseInt($cell.attr('rowspan')) || 1,
            content: $cell.html(),
            style: cellStyle,
            css_class: $cell.attr('class'),
          });
        });
        this.matrix.push(cells);
      });

      // remove empty lines
      this.matrix = this.matrix.filter((row) => { return row.length > 0 });
    },

    renderHtml: function() {
      let $tableEl = null;

      this._deselectCell();

      if (this.element.find('table').length) {
        $tableEl = this.element.find('table');
        $tableEl.html('');
      } else {
        $tableEl = $('<table class="table">');
        this.element.append($tableEl);
      }

      $.each(this.matrix, (row_index, row) => {
        const $row_el = $('<tr>');

        $.each(row, (col_index, cell) => {

          if (cell.colspan > 0) {
            cell.row_index = row_index;
            cell.col_index = col_index;
            cell.row_element = $row_el;

            if (cell.element != undefined)
              cell.content = cell.element.html();

            cell.element = (row_index == 0) ? $('<th>') : $('<td>');
            cell.element.attr('colspan', cell.colspan);
            cell.element.attr('class', cell.css_class);

            if (cell.style != undefined)
              cell.element.css(cell.style);

            cell.element.html(cell.content);
            cell.element.on('click', (e) => {
              this._onCellActionClick(cell);
            });
            $row_el.append(cell.element);
          }
        });

        $tableEl.append($row_el);
      });

      this.$contextMenu.hide();
      this.$cellStyleMenu.hide();
      this._triggerUpdate();
    }
  });
});

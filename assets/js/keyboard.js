/**
 * Keyboard Navigation for Emacs Blog Theme
 * Full-screen buffer switching with split view support
 */

(function() {
  'use strict';

  // State
  let selectedIndex = 0;
  let focusedBuffer = 'list'; // 'list' or 'content'
  let splitMode = null; // null, 'horizontal', or 'vertical'
  let keySequence = '';
  let sequenceTimeout = null;

  // DOM elements
  const bufferContainer = document.getElementById('buffer-container');
  const articleList = document.getElementById('article-list');
  const bufferList = document.getElementById('buffer-list');
  const bufferContent = document.getElementById('buffer-content');
  const contentBody = document.getElementById('content-body');
  const articleContent = document.getElementById('article-content');
  const postsData = document.getElementById('posts-data');
  const echoMessage = document.getElementById('echo-message');
  const helpOverlay = document.getElementById('help-overlay');

  /**
   * Show message in echo area
   */
  function showMessage(msg, type = 'info') {
    if (echoMessage) {
      echoMessage.textContent = msg;
      echoMessage.className = 'echo-message ' + type;
      
      // Clear after 3 seconds
      setTimeout(() => {
        updateEchoHint();
        echoMessage.className = 'echo-message';
      }, 3000);
    }
  }

  /**
   * Update echo area hint based on current state
   */
  function updateEchoHint() {
    if (!echoMessage) return;
    
    if (splitMode) {
      echoMessage.textContent = 'C-x o switch window, C-x 0 close window, ? for help';
    } else if (focusedBuffer === 'list') {
      echoMessage.textContent = 'n/p to navigate, RET to open, C-x 3 split, ? for help';
    } else {
      echoMessage.textContent = 'n/p for next/prev article, q to go back, ? for help';
    }
  }

  /**
   * Get all article items
   */
  function getArticleItems() {
    return articleList ? Array.from(articleList.querySelectorAll('.article-item')) : [];
  }

  /**
   * Update selection in the article list
   */
  function updateSelection(newIndex) {
    const items = getArticleItems();
    if (items.length === 0) return;

    // Clamp index
    newIndex = Math.max(0, Math.min(newIndex, items.length - 1));
    
    // Remove old selection
    items.forEach((item, i) => {
      item.classList.remove('selected');
      item.setAttribute('aria-selected', 'false');
      const marker = item.querySelector('.article-marker');
      if (marker) marker.textContent = ' ';
    });

    // Add new selection
    selectedIndex = newIndex;
    const selectedItem = items[selectedIndex];
    selectedItem.classList.add('selected');
    selectedItem.setAttribute('aria-selected', 'true');
    const marker = selectedItem.querySelector('.article-marker');
    if (marker) marker.textContent = '>';

    // Scroll into view
    selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // Update modeline
    updateListModeline();
    
    // If in split mode, auto-preview the article
    if (splitMode) {
      previewSelectedArticle();
    }
  }

  /**
   * Update list buffer modeline
   */
  function updateListModeline() {
    const items = getArticleItems();
    const modeline = bufferList?.querySelector('.modeline');
    if (modeline) {
      const scrollEl = modeline.querySelector('[data-scroll-position]');
      const lineEl = modeline.querySelector('[data-line-number]');
      
      if (scrollEl) {
        if (items.length === 0) {
          scrollEl.textContent = 'Empty';
        } else if (selectedIndex === 0) {
          scrollEl.textContent = 'Top';
        } else if (selectedIndex === items.length - 1) {
          scrollEl.textContent = 'Bot';
        } else {
          const pct = Math.round((selectedIndex / (items.length - 1)) * 100);
          scrollEl.textContent = pct + '%';
        }
      }
      
      if (lineEl) {
        lineEl.textContent = selectedIndex + 1;
      }
    }
  }

  /**
   * Set focus to a buffer
   */
  function focusBuffer(bufferName) {
    focusedBuffer = bufferName;
    
    if (bufferList) {
      bufferList.classList.toggle('focused', bufferName === 'list');
    }
    if (bufferContent) {
      bufferContent.classList.toggle('focused', bufferName === 'content');
    }
    
    updateEchoHint();
  }

  /**
   * Switch to a buffer (single buffer mode)
   */
  function switchBuffer(bufferName) {
    // If not in split mode, toggle buffer visibility
    if (!splitMode) {
      if (bufferList) {
        bufferList.classList.toggle('active', bufferName === 'list');
      }
      if (bufferContent) {
        bufferContent.classList.toggle('active', bufferName === 'content');
      }
    }
    
    focusBuffer(bufferName);
  }

  /**
   * Set split mode
   */
  function setSplitMode(mode) {
    splitMode = mode;
    
    if (!bufferContainer) return;
    
    // Remove existing split classes
    bufferContainer.classList.remove('split-horizontal', 'split-vertical');
    
    if (mode === 'horizontal') {
      // Side by side: list on left, content on right
      bufferContainer.classList.add('split-horizontal');
      bufferList?.classList.add('active');
      bufferContent?.classList.add('active');
      showMessage('Split horizontally (C-x 3)');
    } else if (mode === 'vertical') {
      // Stacked: list on top, content below
      bufferContainer.classList.add('split-vertical');
      bufferList?.classList.add('active');
      bufferContent?.classList.add('active');
      showMessage('Split vertically (C-x 2)');
    } else {
      // Single buffer mode
      // Keep current focused buffer active, hide the other
      if (focusedBuffer === 'list') {
        bufferList?.classList.add('active');
        bufferContent?.classList.remove('active');
      } else {
        bufferList?.classList.remove('active');
        bufferContent?.classList.add('active');
      }
    }
    
    // Ensure focused buffer styling
    focusBuffer(focusedBuffer);
    
    // If entering split mode with content visible, preview current article
    if (mode && bufferContent?.classList.contains('active')) {
      previewSelectedArticle();
    }
    
    updateEchoHint();
  }

  /**
   * Close current window (C-x 0)
   */
  function closeCurrentWindow() {
    if (!splitMode) {
      showMessage('Only one window');
      return;
    }
    
    // Close current window, switch to the other
    const otherBuffer = focusedBuffer === 'list' ? 'content' : 'list';
    focusBuffer(otherBuffer);
    setSplitMode(null);
    showMessage('Deleted window');
  }

  /**
   * Split window horizontally (C-x 3) - side by side
   */
  function splitHorizontal() {
    if (splitMode === 'horizontal') {
      showMessage('Already split horizontally');
      return;
    }
    setSplitMode('horizontal');
  }

  /**
   * Split window vertically (C-x 2) - stacked
   */
  function splitVertical() {
    if (splitMode === 'vertical') {
      showMessage('Already split vertically');
      return;
    }
    setSplitMode('vertical');
  }

  /**
   * Switch to other window (C-x o)
   */
  function otherWindow() {
    if (!splitMode) {
      // In single buffer mode, just toggle
      const other = focusedBuffer === 'list' ? 'content' : 'list';
      switchBuffer(other);
      showMessage('Switched to ' + (other === 'list' ? '*posts*' : 'article'));
    } else {
      // In split mode, switch focus
      const other = focusedBuffer === 'list' ? 'content' : 'list';
      focusBuffer(other);
      showMessage('Switched to ' + (other === 'list' ? '*posts*' : 'article'));
    }
  }

  /**
   * Preview selected article (without switching focus)
   */
  function previewSelectedArticle() {
    const items = getArticleItems();
    if (items.length === 0) return;

    const selectedItem = items[selectedIndex];
    const title = selectedItem.dataset.title;

    // Check if we have embedded content (homepage)
    if (postsData) {
      const template = postsData.querySelector(`template[data-post-index="${selectedIndex}"]`);
      if (template) {
        loadArticleContent(template, title, false);
        return;
      }
    }
  }

  /**
   * Open selected article (switch to content buffer or focus it)
   */
  function openSelectedArticle() {
    const items = getArticleItems();
    if (items.length === 0) return;

    const selectedItem = items[selectedIndex];
    const title = selectedItem.dataset.title;

    // Check if we have embedded content (homepage)
    if (postsData) {
      const template = postsData.querySelector(`template[data-post-index="${selectedIndex}"]`);
      if (template) {
        loadArticleContent(template, title, true);
        return;
      }
    }

    // Otherwise navigate to the URL
    const url = selectedItem.dataset.url;
    if (url) {
      window.location.href = url;
    }
  }

  /**
   * Load article content from template
   */
  function loadArticleContent(template, title, switchFocus = true) {
    if (!articleContent) return;

    // Clone and insert content
    const content = template.content.cloneNode(true);
    articleContent.innerHTML = '';
    articleContent.appendChild(content);

    // Update content buffer modeline
    const modeline = bufferContent?.querySelector('.modeline');
    if (modeline) {
      const bufferName = modeline.querySelector('.modeline-buffer-name');
      if (bufferName) {
        bufferName.textContent = title.substring(0, 50);
        bufferName.title = title;
      }
    }

    // Switch to content buffer if requested and not in split mode
    if (switchFocus) {
      if (splitMode) {
        // In split mode, just focus the content buffer
        focusBuffer('content');
      } else {
        // In single buffer mode, switch to content
        switchBuffer('content');
      }
      showMessage('Opened: ' + title);
    }
    
    // Scroll content to top
    if (contentBody) {
      contentBody.scrollTop = 0;
    }
  }

  /**
   * Navigate to next/previous article while viewing content
   */
  function navigateArticle(direction) {
    const items = getArticleItems();
    if (items.length === 0) return;

    const newIndex = selectedIndex + direction;
    if (newIndex < 0 || newIndex >= items.length) {
      showMessage(direction > 0 ? 'End of buffer' : 'Beginning of buffer');
      return;
    }

    // Update selection
    updateSelection(newIndex);
    
    // Load the new article (in single buffer mode when viewing content)
    if (!splitMode) {
      const selectedItem = items[selectedIndex];
      const title = selectedItem.dataset.title;
      
      if (postsData) {
        const template = postsData.querySelector(`template[data-post-index="${selectedIndex}"]`);
        if (template) {
          loadArticleContent(template, title, false);
        }
      }
    }
  }

  /**
   * Go back to list buffer
   */
  function goBack() {
    // On single.html pages, navigate back
    if (!postsData) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
      return;
    }

    // If in split mode, just focus list
    if (splitMode) {
      focusBuffer('list');
      showMessage('Switched to *posts*');
      return;
    }

    // In single buffer mode, switch to list buffer
    switchBuffer('list');
    showMessage('Switched to buffer: *posts*');
  }

  /**
   * Scroll content
   */
  function scrollContent(direction) {
    if (!contentBody) return;
    
    const scrollAmount = contentBody.clientHeight * 0.8;
    contentBody.scrollBy({
      top: direction === 'down' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  /**
   * Toggle help overlay
   */
  function toggleHelp() {
    if (!helpOverlay) return;
    
    const isVisible = helpOverlay.classList.contains('visible');
    helpOverlay.classList.toggle('visible', !isVisible);
    helpOverlay.setAttribute('aria-hidden', isVisible);
    
    if (!isVisible) {
      document.getElementById('help-close')?.focus();
    }
  }

  /**
   * Handle key sequence (C-x prefix)
   */
  function handleKeySequence(key) {
    if (keySequence === 'C-x') {
      switch (key) {
        case 'o':
          // C-x o - other window
          otherWindow();
          keySequence = '';
          return true;
        case '0':
          // C-x 0 - close current window
          closeCurrentWindow();
          keySequence = '';
          return true;
        case '2':
          // C-x 2 - split vertically (stacked)
          splitVertical();
          keySequence = '';
          return true;
        case '3':
          // C-x 3 - split horizontally (side by side)
          splitHorizontal();
          keySequence = '';
          return true;
        case 'b':
          // C-x b - switch to list buffer
          switchBuffer('list');
          keySequence = '';
          showMessage('Switched to *posts*');
          return true;
        case '1':
          // C-x 1 - delete other windows (go to single buffer)
          if (splitMode) {
            setSplitMode(null);
            showMessage('Deleted other windows');
          } else {
            showMessage('Only one window');
          }
          keySequence = '';
          return true;
        default:
          keySequence = '';
          showMessage('C-x ' + key + ' is undefined');
          return false;
      }
    }
    
    // g prefix sequences
    keySequence += key;
    
    if (sequenceTimeout) {
      clearTimeout(sequenceTimeout);
    }

    const sequences = {
      'gh': () => { window.location.href = '/'; },
      'gp': () => { window.location.href = '/post/'; },
      'gg': () => { 
        if (focusedBuffer === 'list') {
          updateSelection(0);
        } else if (contentBody) {
          contentBody.scrollTop = 0;
        }
      }
    };

    if (sequences[keySequence]) {
      sequences[keySequence]();
      keySequence = '';
      return true;
    }

    sequenceTimeout = setTimeout(() => {
      keySequence = '';
    }, 1000);

    showMessage(keySequence + '-');
    return false;
  }

  /**
   * Main keyboard handler
   */
  function handleKeydown(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Close help on Escape
    if (e.key === 'Escape') {
      if (helpOverlay?.classList.contains('visible')) {
        toggleHelp();
        e.preventDefault();
        return;
      }
    }

    // Help
    if (e.key === '?') {
      toggleHelp();
      e.preventDefault();
      return;
    }

    // If help is open, ignore other keys
    if (helpOverlay?.classList.contains('visible')) {
      return;
    }

    const key = e.key;
    const ctrl = e.ctrlKey;
    const meta = e.metaKey;
    const shift = e.shiftKey;

    // Handle C-x prefix sequences
    if (keySequence === 'C-x') {
      if (handleKeySequence(key)) {
        e.preventDefault();
        return;
      }
    }

    // Key sequences (g prefix)
    if (keySequence || key === 'g') {
      if (handleKeySequence(key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if (keySequence) return;
    }

    // C-x prefix
    if (ctrl && key === 'x') {
      keySequence = 'C-x';
      showMessage('C-x-');
      e.preventDefault();
      return;
    }

    // C-g - keyboard quit
    if (ctrl && key === 'g') {
      if (helpOverlay?.classList.contains('visible')) {
        toggleHelp();
      }
      keySequence = '';
      showMessage('Quit');
      e.preventDefault();
      return;
    }

    // === LIST BUFFER ===
    if (focusedBuffer === 'list') {
      switch (key) {
        case 'n':
        case 'ArrowDown':
          updateSelection(selectedIndex + 1);
          e.preventDefault();
          break;
        case 'p':
        case 'ArrowUp':
          updateSelection(selectedIndex - 1);
          e.preventDefault();
          break;
        case 'Enter':
        case 'o':
          openSelectedArticle();
          e.preventDefault();
          break;
        case ' ':
          // Space in list - open article
          if (!splitMode) {
            openSelectedArticle();
          } else {
            // In split mode, space scrolls the content pane
            scrollContent('down');
          }
          e.preventDefault();
          break;
        case '<':
          updateSelection(0);
          e.preventDefault();
          break;
        case '>':
          updateSelection(getArticleItems().length - 1);
          e.preventDefault();
          break;
      }
    }

    // === CONTENT BUFFER ===
    if (focusedBuffer === 'content') {
      switch (key) {
        case 'n':
          // n - scroll down or next article (single buffer mode without split)
          if (!ctrl) {
            if (splitMode) {
              // In split mode, n scrolls content
              contentBody?.scrollBy({ top: 150, behavior: 'smooth' });
            } else {
              // In single buffer mode, n goes to next article
              navigateArticle(1);
            }
            e.preventDefault();
          }
          break;
        case 'p':
          // p - scroll up or previous article (single buffer mode without split)
          if (!ctrl) {
            if (splitMode) {
              // In split mode, p scrolls content
              contentBody?.scrollBy({ top: -150, behavior: 'smooth' });
            } else {
              // In single buffer mode, p goes to previous article
              navigateArticle(-1);
            }
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
          // Arrow down - scroll
          contentBody?.scrollBy({ top: 150, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'ArrowUp':
          // Arrow up - scroll
          contentBody?.scrollBy({ top: -150, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'PageDown':
          // Page Down - scroll page
          scrollContent('down');
          e.preventDefault();
          break;
        case 'PageUp':
          // Page Up - scroll page
          scrollContent('up');
          e.preventDefault();
          break;
        case ' ':
          // Space - page down, Shift+Space - page up
          scrollContent(shift ? 'up' : 'down');
          e.preventDefault();
          break;
        case 'v':
          // C-v page down, M-v page up
          if (ctrl) {
            scrollContent('down');
            e.preventDefault();
          } else if (meta || e.altKey) {
            scrollContent('up');
            e.preventDefault();
          }
          break;
        case '<':
          // Beginning of buffer
          if (contentBody) contentBody.scrollTop = 0;
          e.preventDefault();
          break;
        case '>':
          // End of buffer
          if (contentBody) contentBody.scrollTop = contentBody.scrollHeight;
          e.preventDefault();
          break;
        case 'q':
          // q - go back to list
          goBack();
          e.preventDefault();
          break;
      }
    }

    // === GLOBAL ===
    switch (key) {
      case 'Tab':
        // Tab switches focus in split mode
        if (splitMode) {
          otherWindow();
          e.preventDefault();
        }
        break;
      case 't':
        if (!ctrl && !meta) {
          window.toggleTheme?.();
          e.preventDefault();
        }
        break;
      case '+':
      case '=':
        window.adjustFontSize?.(1);
        e.preventDefault();
        break;
      case '-':
        if (!ctrl && !meta) {
          window.adjustFontSize?.(-1);
          e.preventDefault();
        }
        break;
    }
  }

  /**
   * Handle click on article item
   */
  function handleArticleClick(e) {
    const item = e.target.closest('.article-item');
    if (!item) return;

    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
      // Always focus list buffer when clicking in list
      focusBuffer('list');
      
      if (index === selectedIndex && !splitMode) {
        // Click on selected - open it (only in single buffer mode)
        openSelectedArticle();
      } else {
        // Click on different item - select it
        updateSelection(index);
      }
    }
  }

  /**
   * Handle double click to open
   */
  function handleArticleDoubleClick(e) {
    const item = e.target.closest('.article-item');
    if (!item) return;
    
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
      focusBuffer('list');
      updateSelection(index);
      openSelectedArticle();
    }
  }

  /**
   * Handle click on content buffer
   */
  function handleContentClick() {
    focusBuffer('content');
  }

  /**
   * Initialize
   */
  function init() {
    // Keyboard events
    document.addEventListener('keydown', handleKeydown);

    // Click events
    articleList?.addEventListener('click', handleArticleClick);
    articleList?.addEventListener('dblclick', handleArticleDoubleClick);
    bufferContent?.addEventListener('click', handleContentClick);

    // Help close button
    document.getElementById('help-close')?.addEventListener('click', toggleHelp);

    // Initialize selection and modeline
    updateListModeline();
    
    // Set initial focus
    focusBuffer('list');

    // Set initial echo area message
    updateEchoHint();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for other modules
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.keyboard = {
    switchBuffer,
    focusBuffer,
    setSplitMode,
    updateSelection,
    showMessage
  };
})();

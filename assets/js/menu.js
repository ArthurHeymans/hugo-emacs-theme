/**
 * Menu Bar Interactions for Emacs Blog Theme
 * Handles dropdown menus, theme toggle, and font size
 */

(function() {
  'use strict';

  // State
  let openMenu = null;
  let fontSize = 100; // percentage

  // DOM elements
  const menuBar = document.querySelector('.menu-bar');
  const menuItems = document.querySelectorAll('.menu-item');
  const hamburger = document.querySelector('.menu-hamburger');

  /**
   * Toggle theme between dark and light
   */
  function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('emacs-theme', newTheme);
    
    // Update theme icons
    document.querySelectorAll('.theme-icon-dark').forEach(el => {
      el.style.display = newTheme === 'dark' ? 'inline' : 'none';
    });
    document.querySelectorAll('.theme-icon-light').forEach(el => {
      el.style.display = newTheme === 'light' ? 'inline' : 'none';
    });
    
    // Show message
    window.emacsBlog?.keyboard?.showMessage?.('Theme: ' + (newTheme === 'dark' ? 'Modus Vivendi' : 'Modus Operandi'));
  }

  /**
   * Adjust font size
   */
  function adjustFontSize(delta) {
    fontSize = Math.max(80, Math.min(150, fontSize + delta * 10));
    document.documentElement.style.fontSize = fontSize + '%';
    localStorage.setItem('emacs-font-size', fontSize);
    
    window.emacsBlog?.keyboard?.showMessage?.('Font size: ' + fontSize + '%');
  }

  /**
   * Reset font size
   */
  function resetFontSize() {
    fontSize = 100;
    document.documentElement.style.fontSize = '100%';
    localStorage.removeItem('emacs-font-size');
    
    window.emacsBlog?.keyboard?.showMessage?.('Font size reset');
  }

  /**
   * Restore font size from localStorage
   */
  function restoreFontSize() {
    const saved = localStorage.getItem('emacs-font-size');
    if (saved) {
      fontSize = parseInt(saved, 10);
      if (!isNaN(fontSize) && fontSize >= 80 && fontSize <= 150) {
        document.documentElement.style.fontSize = fontSize + '%';
      }
    }
  }

  /**
   * Open a menu dropdown
   */
  function openMenuDropdown(menuItem) {
    closeAllMenus();
    menuItem.classList.add('open');
    menuItem.querySelector('button')?.setAttribute('aria-expanded', 'true');
    openMenu = menuItem;
  }

  /**
   * Close all menus
   */
  function closeAllMenus() {
    menuItems.forEach(item => {
      item.classList.remove('open');
      item.querySelector('button')?.setAttribute('aria-expanded', 'false');
    });
    openMenu = null;
  }

  /**
   * Toggle mobile menu
   */
  function toggleMobileMenu() {
    menuBar?.classList.toggle('menu-open');
    const isOpen = menuBar?.classList.contains('menu-open');
    hamburger?.setAttribute('aria-expanded', isOpen);
  }

  /**
   * Handle menu item click
   */
  function handleMenuClick(e) {
    const menuItem = e.target.closest('.menu-item');
    if (!menuItem) return;
    
    const button = e.target.closest('button');
    if (button && button.parentElement === menuItem) {
      // Toggle dropdown
      if (menuItem.classList.contains('open')) {
        closeAllMenus();
      } else {
        openMenuDropdown(menuItem);
      }
      e.preventDefault();
      return;
    }
  }

  /**
   * Handle dropdown item click
   */
  function handleDropdownClick(e) {
    const dropdownItem = e.target.closest('.menu-dropdown-item');
    if (!dropdownItem) return;
    
    const action = dropdownItem.dataset.action;
    
    switch (action) {
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'increase-font':
        adjustFontSize(1);
        break;
      case 'decrease-font':
        adjustFontSize(-1);
        break;
      case 'reset-font':
        resetFontSize();
        break;
      case 'show-help':
        document.getElementById('help-overlay')?.classList.add('visible');
        break;
    }
    
    closeAllMenus();
  }

  /**
   * Handle clicks outside menu to close
   */
  function handleOutsideClick(e) {
    if (!openMenu) return;
    
    if (!e.target.closest('.menu-item')) {
      closeAllMenus();
    }
  }

  /**
   * Handle keyboard navigation in menus
   */
  function handleMenuKeydown(e) {
    if (!openMenu) return;
    
    const dropdown = openMenu.querySelector('.menu-dropdown');
    const items = dropdown?.querySelectorAll('.menu-dropdown-item:not(.disabled)');
    if (!items || items.length === 0) return;
    
    const focusedItem = dropdown.querySelector('.menu-dropdown-item:focus');
    let currentIndex = focusedItem ? Array.from(items).indexOf(focusedItem) : -1;
    
    switch (e.key) {
      case 'ArrowDown':
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].focus();
        e.preventDefault();
        break;
      case 'ArrowUp':
        currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[currentIndex].focus();
        e.preventDefault();
        break;
      case 'Escape':
        closeAllMenus();
        openMenu?.querySelector('button')?.focus();
        e.preventDefault();
        break;
      case 'Enter':
        if (focusedItem) {
          focusedItem.click();
          e.preventDefault();
        }
        break;
    }
  }

  /**
   * Initialize theme from saved preference
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('emacs-theme');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Update icons based on current theme
    document.querySelectorAll('.theme-icon-dark').forEach(el => {
      el.style.display = currentTheme === 'dark' ? 'inline' : 'none';
    });
    document.querySelectorAll('.theme-icon-light').forEach(el => {
      el.style.display = currentTheme === 'light' ? 'inline' : 'none';
    });
  }

  /**
   * Initialize
   */
  function init() {
    // Menu interactions
    menuItems.forEach(item => {
      item.addEventListener('click', handleMenuClick);
    });
    
    // Dropdown item clicks
    document.querySelectorAll('.menu-dropdown-item').forEach(item => {
      item.addEventListener('click', handleDropdownClick);
    });
    
    // Theme toggle buttons (only the one in menu bar right, dropdown items handled by handleDropdownClick)
    document.querySelectorAll('[data-action="toggle-theme"]:not(.menu-dropdown-item)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        toggleTheme();
        closeAllMenus();
        e.preventDefault();
      });
    });
    
    // Hamburger menu
    hamburger?.addEventListener('click', toggleMobileMenu);
    
    // Close menus on outside click
    document.addEventListener('click', handleOutsideClick);
    
    // Keyboard navigation in menus
    document.addEventListener('keydown', handleMenuKeydown);
    
    // Mouse enter to open adjacent menus
    menuItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (openMenu && openMenu !== item) {
          openMenuDropdown(item);
        }
      });
    });
    
    // Initialize theme and font size
    initTheme();
    restoreFontSize();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally for keyboard shortcuts
  window.toggleTheme = toggleTheme;
  window.adjustFontSize = adjustFontSize;
  window.resetFontSize = resetFontSize;

  // Expose for other modules
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.menu = {
    toggleTheme,
    adjustFontSize,
    resetFontSize,
    closeAllMenus
  };
})();

# Motion component library — ported, in the project (some not yet mounted)
All vanilla ports of Mark's Motion+ pastes. Load order: after motion.js.

| File | Component | Mounted where |
|---|---|---|
| studio-motion.js | drawer/modal springs | studio |
| workarea-nav.js | work-area pill + iris wash transition | all 3 |
| canvas-menu.js | radial launcher (Create/Plan/Library/Deliver, fade-away) | canvas |
| command-palette.js | ⌘K palette (registry: window.SturijCommands) | all 3 |
| confetti.js | celebrations (admin-gated, off by default) | all 3 |
| share-sheet.js | draggable bottom share sheet | all 3 |
| board-viewer.js | 3D board viewer + bottom action bar (add to assets, favourite, share, order sample) | all 3 |
| status-badge.js | multi-state badge (enhance→processing→received→library) — window.SturijBadge | all 3 (lib, unmounted) |
| progress-bar.js | progress bar + circular counting ring — SturijProgress / SturijProgressRing | LIB ONLY, not yet included |
| rec-indicator.js | recording pill (dot + level bar) — window.SturijRec | studio, canvas, creative, chat, mobile |
| accordion.js | spring accordion — window.SturijAccordion | LIB ONLY, not yet included |
| dialog.js | confirm dialog, 3D blur entrance — window.SturijDialog (Promise<boolean>) | LIB ONLY, not yet included |
| dropdown.js | dropdown + right-click context menu (submenus, shortcuts, checks) — SturijDropdown / SturijContextMenu | all 3 (via action bar) |
| radio.js | animated radio group (ring draw + dot spring) — window.SturijRadio | LIB ONLY, not yet included |
| tabs.js | animated tabs: underline style + segmented pill style with direction-aware slide — window.SturijTabs | LIB ONLY, not yet included |
| toggle-group.js | toggle group + toolbar (sliding indicator, multi fill, separators, action buttons) — SturijToggleGroup / SturijToolbar | all 3 (loaded, ready to use) |
| toast-action.js | toasts: bottom-right action toast + bottom-centre stacked notifications — SturijToast / SturijNotify | LIB ONLY, not yet included |
| cursor.js | custom cursor with zone captions (gold dot → ink label pill) — window.SturijCursor | LIB ONLY, not yet included |
| hero-stagger.js | hero entrance cascade + prime-loop drifting glows — SturijStagger / SturijGlow | LIB ONLY, not yet included |
| bobble.js | Bobble Hover: swept-collision velocity springs on tiles — window.SturijBobble | LIB ONLY, not yet included |
| action-bar.js | global action bar: Layout · Share · Notes + People/Library/Settings menus | all 3 |
| compare-reveal.js | before/after reveal slider | canvas |
| creative-todos.js | reorder+swipe to-dos | creative |
| creative-create.js | morphing Create-new (customer actions) | creative |
| creative-gallery.js | gallery modules: covers, upload, carousel, lightbox, grid reorder | creative |
| collection.html | 3D stock surf (send to project assets) | page |
| news.html | infinite-loading feed (P11) | page |
| Board 3D.dc.html / framer/ | specimen board + Framer exports | design docs |

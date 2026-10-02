/* The visualiser's address — the one place it is written for the static pages (Studio, Canvas, Chat).
   Every surface is a sturij.com address behind one password pattern (decision, 2 Oct 2026): the visualiser
   (Vercel project `sturij`) is served at visualiser.sturij.com. studio.js, canvas.js and chat.html read
   window.STURIJ_VISUALISER_ORIGIN for the render endpoint, the embed frame and the plan hand-off, so a move
   is one line here. Load this before those scripts. It is a fixed https origin with no trailing slash;
   nothing from the page's URL reaches it. */
window.STURIJ_VISUALISER_ORIGIN='https://visualiser.sturij.com';

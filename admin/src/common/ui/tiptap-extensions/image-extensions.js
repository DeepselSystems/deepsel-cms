import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from 'prosemirror-state';

// Extension to add image hover menu
export const ImageHoverMenu = Extension.create({
  name: 'imageHoverMenu',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageHoverMenu'),
        props: {
          nodeViews: {
            image: (node, view, getPos) => {
              // Create wrapper div to hold both the image and menu
              const wrapper = document.createElement('div');
              wrapper.classList.add('image-wrapper');
              wrapper.style.position = 'relative';
              wrapper.style.display = 'inline-block';
              wrapper.style.maxWidth = 'fit-content';

              // Create the image element
              const img = document.createElement('img');
              img.src = node.attrs.src;
              img.alt = node.attrs.alt || '';
              if (node.attrs.title) {
                img.title = node.attrs.title;
              }
              if (node.attrs.width) {
                img.width = node.attrs.width;
              }

              // Apply rounded corners if set
              if (node.attrs.rounded !== false) {
                // Default is true
                img.style.borderRadius = '6px';
              }

              // Apply alignment
              if (node.attrs.alignment) {
                if (node.attrs.alignment === 'center') {
                  wrapper.style.margin = '0 auto';
                  wrapper.style.display = 'block';
                } else if (node.attrs.alignment === 'left') {
                  wrapper.style.margin = '0 auto 0 0';
                  wrapper.style.display = 'block';
                } else if (node.attrs.alignment === 'right') {
                  wrapper.style.margin = '0 0 0 auto';
                  wrapper.style.display = 'block';
                }
              }

              // Create the hover menu
              const menu = document.createElement('div');
              menu.classList.add('image-menu');

              // Add align left button
              const alignLeftBtn = document.createElement('button');
              alignLeftBtn.type = 'button'; // Prevent form submission
              alignLeftBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M288 64c0 17.7-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32H256c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H256c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>';
              alignLeftBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';
              alignLeftBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  alignment: 'left',
                });
                dispatch(tr);
              });
              menu.appendChild(alignLeftBtn);

              // Add align center button
              const alignCenterBtn = document.createElement('button');
              alignCenterBtn.type = 'button'; // Prevent form submission
              alignCenterBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M352 64c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32s14.3 32 32 32h192c17.7 0 32-14.3 32-32zm0 384c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32s14.3 32 32 32h192c17.7 0 32-14.3 32-32zM0 192c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zm32 160h384c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32z"/></svg>';
              alignCenterBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';
              alignCenterBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  alignment: 'center',
                });
                dispatch(tr);
              });
              menu.appendChild(alignCenterBtn);

              // Add align right button
              const alignRightBtn = document.createElement('button');
              alignRightBtn.type = 'button'; // Prevent form submission
              alignRightBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M448 64c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32s14.3-32 32-32h224c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32s14.3-32 32-32h224c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h384c17.7 0 32 14.3 32 32z"/></svg>';
              alignRightBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';
              alignRightBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  alignment: 'right',
                });
                dispatch(tr);
              });
              menu.appendChild(alignRightBtn);

              // Add increase size button
              const increaseBtn = document.createElement('button');
              increaseBtn.type = 'button'; // Prevent form submission
              increaseBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>';
              increaseBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';
              increaseBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const currentWidth = currentNode.attrs.width || 300;
                // Use 10% increase instead of fixed 50px
                const newWidth = Math.round(currentWidth * 1.1);
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  width: newWidth,
                });
                dispatch(tr);
              });
              menu.appendChild(increaseBtn);

              // Add decrease size button
              const decreaseBtn = document.createElement('button');
              decreaseBtn.type = 'button'; // Prevent form submission
              decreaseBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M432 256c0 17.7-14.3 32-32 32H48c-17.7 0-32-14.3-32-32s14.3-32 32-32h352c17.7 0 32 14.3 32 32z"/></svg>';
              decreaseBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';
              decreaseBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const currentWidth = currentNode.attrs.width || 300;
                // Use 10% decrease instead of fixed 50px, with a minimum of 50px
                const newWidth = Math.max(50, Math.round(currentWidth * 0.9));
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  width: newWidth,
                });
                dispatch(tr);
              });
              menu.appendChild(decreaseBtn);

              // Add toggle rounded corners button
              const roundedBtn = document.createElement('button');
              roundedBtn.type = 'button'; // Prevent form submission
              roundedBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 512 512"><path fill="#808496" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"/></svg>';
              roundedBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed]';

              // Function to update the button appearance based on rounded state
              const updateRoundedButtonState = (isRounded) => {
                if (isRounded) {
                  roundedBtn.style.backgroundColor = '#e4e6ed';
                } else {
                  roundedBtn.style.backgroundColor = '';
                }
              };

              roundedBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Get the current node state
                const currentNode = state.doc.nodeAt(pos);
                const isRounded = currentNode.attrs.rounded !== false; // Default is true
                // Toggle rounded corners
                const tr = state.tr.setNodeMarkup(pos, null, {
                  ...currentNode.attrs,
                  rounded: !isRounded,
                });
                dispatch(tr);

                // Update button appearance
                updateRoundedButtonState(!isRounded);

                // Update the image style directly for immediate feedback
                const imgElement = wrapper.querySelector('img');
                if (imgElement) {
                  if (!isRounded) {
                    imgElement.style.borderRadius = '6px';
                  } else {
                    imgElement.style.borderRadius = '0';
                  }
                }
              });

              // Set initial button state based on current rounded status
              const initialNode = view.state.doc.nodeAt(getPos());
              const initialRounded = initialNode.attrs.rounded !== false;
              updateRoundedButtonState(initialRounded);

              menu.appendChild(roundedBtn);

              // Add delete image button
              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button'; // Prevent form submission
              deleteBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="#808496" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>';
              deleteBtn.className =
                'w-[26px] h-[26px] flex justify-center items-center rounded-[4px] p-1 font-normal cursor-pointer hover:bg-[#e4e6ed] hover:bg-red-100';
              deleteBtn.addEventListener('click', () => {
                const {state, dispatch} = view;
                view.focus();
                const pos = getPos();
                // Delete the image node
                const tr = state.tr.delete(pos, pos + 1);
                dispatch(tr);
              });
              menu.appendChild(deleteBtn);

              // Add CSS for the menu
              menu.style.display = 'none';
              menu.style.position = 'absolute';
              menu.style.top = '50%';
              menu.style.left = '50%';
              menu.style.transform = 'translate(-50%, -50%)';
              menu.style.backgroundColor = 'white';
              menu.style.border = '1px solid #e0e0e0';
              menu.style.borderRadius = '4px';
              menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              menu.style.zIndex = '20';
              menu.style.padding = '4px';
              menu.style.display = 'flex';
              menu.style.gap = '2px';
              menu.style.pointerEvents = 'auto'; // Ensure menu is clickable
              menu.style.minWidth = 'fit-content'; // Ensure menu doesn't shrink

              // Create a transparent overlay to ensure the menu stays visible
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = '0';
              overlay.style.left = '0';
              overlay.style.width = '100%';
              overlay.style.height = '100%';
              overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
              overlay.style.opacity = '0';
              overlay.style.transition = 'opacity 0.2s';
              overlay.style.display = 'none';

              // Add hover behavior with a small delay to prevent flickering
              let hoverTimeout;

              const showMenu = () => {
                clearTimeout(hoverTimeout);
                menu.style.display = 'flex';
                overlay.style.display = 'block';
                setTimeout(() => {
                  overlay.style.opacity = '0.1';
                }, 10);
              };

              const hideMenu = () => {
                hoverTimeout = setTimeout(() => {
                  menu.style.display = 'none';
                  overlay.style.opacity = '0';
                  setTimeout(() => {
                    overlay.style.display = 'none';
                  }, 200);
                }, 200);
              };

              wrapper.addEventListener('mouseenter', showMenu);
              wrapper.addEventListener('mouseleave', hideMenu);
              menu.addEventListener('mouseenter', () =>
                clearTimeout(hoverTimeout)
              );
              menu.addEventListener('mouseleave', hideMenu);

              // Append elements to the wrapper
              wrapper.appendChild(img);
              wrapper.appendChild(overlay);
              wrapper.appendChild(menu);

              return {
                dom: wrapper,
                update: (updatedNode) => {
                  if (updatedNode.type.name !== 'image') return false;

                  // Update image attributes
                  img.src = updatedNode.attrs.src;
                  img.alt = updatedNode.attrs.alt || '';
                  if (updatedNode.attrs.title) {
                    img.title = updatedNode.attrs.title;
                  }
                  if (updatedNode.attrs.width) {
                    img.width = updatedNode.attrs.width;
                  }

                  // Update alignment
                  if (updatedNode.attrs.alignment) {
                    if (updatedNode.attrs.alignment === 'center') {
                      wrapper.style.margin = '0 auto';
                      wrapper.style.display = 'block';
                    } else if (updatedNode.attrs.alignment === 'left') {
                      wrapper.style.margin = '0 auto 0 0';
                      wrapper.style.display = 'block';
                    } else if (updatedNode.attrs.alignment === 'right') {
                      wrapper.style.margin = '0 0 0 auto';
                      wrapper.style.display = 'block';
                    }
                  }

                  return true;
                },
                destroy: () => {
                  // Clean up event listeners
                  wrapper.removeEventListener('mouseenter', showMenu);
                  wrapper.removeEventListener('mouseleave', hideMenu);
                  menu.removeEventListener('mouseenter', () =>
                    clearTimeout(hoverTimeout)
                  );
                  menu.removeEventListener('mouseleave', hideMenu);
                  alignLeftBtn.removeEventListener('click', () => {});
                  alignCenterBtn.removeEventListener('click', () => {});
                  alignRightBtn.removeEventListener('click', () => {});
                  increaseBtn.removeEventListener('click', () => {});
                  decreaseBtn.removeEventListener('click', () => {});
                },
              };
            },
          },
        },
      }),
    ];
  },
});

// Extension to add image alignment functionality
export const ImageAlignment = Extension.create({
  name: 'imageAlignment',

  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          alignment: {
            default: 'center',
            parseHTML: (element) =>
              element.getAttribute('data-alignment') || 'center',
            renderHTML: (attributes) => {
              if (!attributes.alignment) {
                return {};
              }
              return {
                'data-alignment': attributes.alignment,
                style: `display: block; margin: ${attributes.alignment === 'center' ? '0 auto' : attributes.alignment === 'left' ? '0 auto 0 0' : '0 0 0 auto'};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setImageAlignment:
        (alignment) =>
        ({editor, commands}) => {
          if (editor.isActive('image')) {
            return commands.updateAttributes('image', {alignment});
          }
          return false;
        },
    };
  },
});

// Extension to add image resizing functionality
export const ImageResize = Extension.create({
  name: 'imageResize',

  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          width: {
            default: 300,
            parseHTML: (element) => element.getAttribute('width') || 300,
            renderHTML: (attributes) => {
              if (!attributes.width) {
                return {};
              }
              return {
                width: attributes.width,
              };
            },
          },
          rounded: {
            default: true,
            parseHTML: (element) => {
              const style = element.getAttribute('style') || '';
              return style.includes('border-radius') ? true : false;
            },
            renderHTML: (attributes) => {
              return {
                style: attributes.rounded ? 'border-radius: 6px;' : '',
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setImageSize:
        (width) =>
        ({editor, commands}) => {
          if (editor.isActive('image')) {
            return commands.updateAttributes('image', {width});
          }
          return false;
        },
      toggleImageRounded:
        () =>
        ({editor, commands}) => {
          if (editor.isActive('image')) {
            // Get current node attributes
            const node = editor.state.selection.$anchor.node();
            const isRounded = node.attrs.rounded !== false; // Default is true
            // Toggle rounded status
            return commands.updateAttributes('image', {rounded: !isRounded});
          }
          return false;
        },
    };
  },
});

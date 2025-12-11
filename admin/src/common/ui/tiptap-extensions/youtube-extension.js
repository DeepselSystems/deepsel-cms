import {Node, mergeAttributes} from '@tiptap/core';

export const YoutubeEmbed = Node.create({
  name: 'youtubeEmbed',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'w-full aspect-video my-4',
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: 640,
      },
      height: {
        default: 480,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="youtube.com"], iframe[src*="youtu.be"]',
      },
    ];
  },

  renderHTML({HTMLAttributes}) {
    const embedUrl = this.getEmbedUrl(HTMLAttributes.src);

    return [
      'div',
      {class: 'youtube-embed-wrapper'},
      [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, {
          width: HTMLAttributes.width,
          height: HTMLAttributes.height,
          src: embedUrl,
          frameborder: 0,
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: true,
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setYoutubeVideo:
        (options) =>
        ({commands}) => {
          if (!options.src) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  getEmbedUrl(url) {
    if (!url) {
      return null;
    }

    // Handle different YouTube URL formats
    const youtubeRegExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(youtubeRegExp);

    const videoId = match && match[2].length === 11 ? match[2] : url;

    return `https://www.youtube.com/embed/${videoId}`;
  },
});

export default YoutubeEmbed;

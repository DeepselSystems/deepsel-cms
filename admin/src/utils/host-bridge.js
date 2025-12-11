/* Auto-generated. Do not edit. */
import * as _capacitor_app from "@capacitor/app";
import * as _capacitor_core from "@capacitor/core";
import * as _capacitor_device from "@capacitor/device";
import * as _capacitor_preferences from "@capacitor/preferences";
import * as _emotion_react from "@emotion/react";
import * as _emotion_styled from "@emotion/styled";
import * as _fortawesome_fontawesome_svg_core from "@fortawesome/fontawesome-svg-core";
import * as _fortawesome_free_brands_svg_icons from "@fortawesome/free-brands-svg-icons";
import * as _fortawesome_free_solid_svg_icons from "@fortawesome/free-solid-svg-icons";
import * as _fortawesome_react_fontawesome from "@fortawesome/react-fontawesome";
import * as _hello_pangea_dnd from "@hello-pangea/dnd";
import * as _mantine_charts from "@mantine/charts";
import * as _mantine_core from "@mantine/core";
import * as _mantine_dates from "@mantine/dates";
import * as _mantine_dropzone from "@mantine/dropzone";
import * as _mantine_form from "@mantine/form";
import * as _mantine_hooks from "@mantine/hooks";
import * as _mantine_modals from "@mantine/modals";
import * as _mantine_tiptap from "@mantine/tiptap";
import * as _mui_material from "@mui/material";
import * as _mui_x_data_grid from "@mui/x-data-grid";
import * as _tiptap_core from "@tiptap/core";
import * as _tiptap_extension_color from "@tiptap/extension-color";
import * as _tiptap_extension_details from "@tiptap/extension-details";
import * as _tiptap_extension_details_content from "@tiptap/extension-details-content";
import * as _tiptap_extension_details_summary from "@tiptap/extension-details-summary";
import * as _tiptap_extension_highlight from "@tiptap/extension-highlight";
import * as _tiptap_extension_image from "@tiptap/extension-image";
import * as _tiptap_extension_link from "@tiptap/extension-link";
import * as _tiptap_extension_placeholder from "@tiptap/extension-placeholder";
import * as _tiptap_extension_subscript from "@tiptap/extension-subscript";
import * as _tiptap_extension_superscript from "@tiptap/extension-superscript";
import * as _tiptap_extension_table from "@tiptap/extension-table";
import * as _tiptap_extension_table_cell from "@tiptap/extension-table-cell";
import * as _tiptap_extension_table_header from "@tiptap/extension-table-header";
import * as _tiptap_extension_table_row from "@tiptap/extension-table-row";
import * as _tiptap_extension_text_align from "@tiptap/extension-text-align";
import * as _tiptap_extension_text_style from "@tiptap/extension-text-style";
import * as _tiptap_extension_underline from "@tiptap/extension-underline";
import * as _tiptap_extension_youtube from "@tiptap/extension-youtube";
import * as _tiptap_react from "@tiptap/react";
import * as _tiptap_starter_kit from "@tiptap/starter-kit";
import * as class_variance_authority from "class-variance-authority";
import * as clsx from "clsx";
import * as dayjs from "dayjs";
import * as e from "e";
import * as i18next from "i18next";
import * as i18next_browser_languagedetector from "i18next-browser-languagedetector";
import * as i18next_http_backend from "i18next-http-backend";
import * as localforage from "localforage";
import * as lodash from "lodash";
import * as lucide_react from "lucide-react";
import * as match_sorter from "match-sorter";
import * as prismjs from "prismjs";
import * as prop_types from "prop-types";
import * as qrcode from "qrcode";
import * as react from "react";
import * as react_device_detect from "react-device-detect";
import * as react_dom from "react-dom";
import * as react_helmet from "react-helmet";
import * as react_i18next from "react-i18next";
import * as react_router_dom from "react-router-dom";
import * as react_simple_code_editor from "react-simple-code-editor";
import * as recharts from "recharts";
import * as sort_by from "sort-by";
import * as tailwind_merge from "tailwind-merge";
import * as tailwindcss_animate from "tailwindcss-animate";
import * as tiptap_extension_font_size from "tiptap-extension-font-size";
import * as uuid from "uuid";
import * as zustand from "zustand";

export default function bridgeVendors() {
  const g = (typeof window !== 'undefined') ? window : (globalThis ?? {});
  g.VendorLibs = g.VendorLibs || {};
  Object.assign(g.VendorLibs, {
  "@capacitor/app": _capacitor_app,
  "@capacitor/core": _capacitor_core,
  "@capacitor/device": _capacitor_device,
  "@capacitor/preferences": _capacitor_preferences,
  "@emotion/react": _emotion_react,
  "@emotion/styled": _emotion_styled,
  "@fortawesome/fontawesome-svg-core": _fortawesome_fontawesome_svg_core,
  "@fortawesome/free-brands-svg-icons": _fortawesome_free_brands_svg_icons,
  "@fortawesome/free-solid-svg-icons": _fortawesome_free_solid_svg_icons,
  "@fortawesome/react-fontawesome": _fortawesome_react_fontawesome,
  "@hello-pangea/dnd": _hello_pangea_dnd,
  "@mantine/charts": _mantine_charts,
  "@mantine/core": _mantine_core,
  "@mantine/dates": _mantine_dates,
  "@mantine/dropzone": _mantine_dropzone,
  "@mantine/form": _mantine_form,
  "@mantine/hooks": _mantine_hooks,
  "@mantine/modals": _mantine_modals,
  "@mantine/tiptap": _mantine_tiptap,
  "@mui/material": _mui_material,
  "@mui/x-data-grid": _mui_x_data_grid,
  "@tiptap/core": _tiptap_core,
  "@tiptap/extension-color": _tiptap_extension_color,
  "@tiptap/extension-details": _tiptap_extension_details,
  "@tiptap/extension-details-content": _tiptap_extension_details_content,
  "@tiptap/extension-details-summary": _tiptap_extension_details_summary,
  "@tiptap/extension-highlight": _tiptap_extension_highlight,
  "@tiptap/extension-image": _tiptap_extension_image,
  "@tiptap/extension-link": _tiptap_extension_link,
  "@tiptap/extension-placeholder": _tiptap_extension_placeholder,
  "@tiptap/extension-subscript": _tiptap_extension_subscript,
  "@tiptap/extension-superscript": _tiptap_extension_superscript,
  "@tiptap/extension-table": _tiptap_extension_table,
  "@tiptap/extension-table-cell": _tiptap_extension_table_cell,
  "@tiptap/extension-table-header": _tiptap_extension_table_header,
  "@tiptap/extension-table-row": _tiptap_extension_table_row,
  "@tiptap/extension-text-align": _tiptap_extension_text_align,
  "@tiptap/extension-text-style": _tiptap_extension_text_style,
  "@tiptap/extension-underline": _tiptap_extension_underline,
  "@tiptap/extension-youtube": _tiptap_extension_youtube,
  "@tiptap/react": _tiptap_react,
  "@tiptap/starter-kit": _tiptap_starter_kit,
  "class-variance-authority": class_variance_authority,
  "clsx": clsx,
  "dayjs": dayjs,
  "e": e,
  "i18next": i18next,
  "i18next-browser-languagedetector": i18next_browser_languagedetector,
  "i18next-http-backend": i18next_http_backend,
  "localforage": localforage,
  "lodash": lodash,
  "lucide-react": lucide_react,
  "match-sorter": match_sorter,
  "prismjs": prismjs,
  "prop-types": prop_types,
  "qrcode": qrcode,
  "react": react,
  "react-device-detect": react_device_detect,
  "react-dom": react_dom,
  "react-helmet": react_helmet,
  "react-i18next": react_i18next,
  "react-router-dom": react_router_dom,
  "react-simple-code-editor": react_simple_code_editor,
  "recharts": recharts,
  "sort-by": sort_by,
  "tailwind-merge": tailwind_merge,
  "tailwindcss-animate": tailwindcss_animate,
  "tiptap-extension-font-size": tiptap_extension_font_size,
  "uuid": uuid,
  "zustand": zustand
  });
}

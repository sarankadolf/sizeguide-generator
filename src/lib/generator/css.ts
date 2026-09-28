/**
 * CSS templates extracted from the reference HTML size guide files.
 * CSS_LTR: English (direction: ltr)
 * CSS_RTL: Arabic (direction: rtl) — mirrors floats, margins, and paddings.
 * The direction and image URL are injected dynamically by the engine.
 */

/**
 * Build the primary CSS block (css1).
 * Contains all layout, typography, table, switch toggle, and responsive styles.
 * Horizontal properties (float, margin-left/right, padding-left/right) are
 * conditionally flipped when direction === 'rtl'.
 */
export function buildCss1(
  direction: 'ltr' | 'rtl',
  imageUrl: string,
  hasSf: boolean,
): string {
  const isRtl = direction === 'rtl';

  const sfHide = hasSf
    ? `        .sizeGuide-modal #in-sf-table {
            display: none;
        }
`
    : '';

  return `        body {
            direction: ${direction};
        }
        @font-face {
            font-family: "Proxima Nova";
            src: url("https://i1.lmsin.net/website_images/brand_exp/fonts/Proxima_Nova.ttf") format("truetype");
        }
        @font-face {
            font-family: "Proxima Nova Bold";
            src: url("https://i1.lmsin.net/website_images/brand_exp/fonts/Proxima_Nova_Bold.ttf") format("truetype");
        }
        .man-image {
            content: url("${imageUrl}");
        }
        .sizeGuide-modal .table-1 #cm-rf-table {
            display: table;
        }
        .sizeGuide-modal .table-1 #in-rf-table {
            display: none;
        }
        .sizeGuide-modal .table-2 #cm-rf-table {
            display: table;
        }
        .sizeGuide-modal .table-2 #in-sf-table {
            display: none;
        }
        .sizeGuide-modal footer {
            text-align: center;
            font-weight: bold;
            margin: ${isRtl ? '5px 7px 15px 15px' : '5px 15px 15px 7px'};
            padding: 20px 0 0 0;
            border-top: 1px solid #ecedeb;
            font-family: "Proxima Nova";
        }
        .sizeGuide-modal .rightBlock {
            display: block;
            width: 100%;
            margin: 20px 0;
        }
        .sizeGuide-modal {
            font-family: "Proxima Nova";
        }
        .sizeGuide-modal header {
            margin-top: 23px;
        }
        .sizeGuide-modal .title {
            font-family: "Proxima Nova Bold";
            font-size: 16px !important;
            font-weight: bold !important;
            ${isRtl ? 'margin-right: 15px;' : 'margin-left: 15px;'}
        }
        .sizeGuide-modal table,
        td,
        th {
            border: 1px solid #ecedeb;
        }
        .sizeGuide-modal table td {
            width: 55px;
            vertical-align: middle;
            text-align: center !important;
            white-space: nowrap;
        }
        .sizeGuide-modal table tr,
        th {
            height: 42px;
        }
        .sizeGuide-modal table {
            border-collapse: collapse;
            width: 95%;
            margin: ${isRtl ? '15px 7px 18px 15px' : '15px 15px 18px 7px'};
            text-align: center;
            font-family: "Proxima Nova Bold";
        }
        .sizeGuide-modal table tr:nth-child(even),
        thead tr {
            background: #fbfbfb;
        }
        .sizeGuide-modal .measurement {
            ${isRtl ? 'margin-right: 7px;' : 'margin-left: 7px;'}
            ${isRtl ? 'text-align: right;' : ''}
            width: 95%;
            margin-bottom: 20px;
        }
        .sizeGuide-modal .measurement p {
            color: #000000;
            font-size: 14px;
        }
        .sizeGuide-modal .measurement .title {
            margin: 0;
            color: #000000;
        }
        .sizeGuide-modal .active {
            font-family: "Proxima Nova Bold";
            text-decoration: underline;
        }
        .sizeGuide-modal .dimention {
            float: ${isRtl ? 'left' : 'right'};
            ${isRtl ? 'margin-left: 15px;' : 'margin-right: 15px;'}
        }
        .sizeGuide-modal .inch {
            ${isRtl ? 'margin-right: 10px;' : 'margin-left: 10px;'}
        }
        .sizeGuide-modal .image {
            text-align: center;
        }
        .sizeGuide-modal hr {
            border-top: #ecedeb;
            width: 95%;
        }
        .sizeGuide-modal footer {
            font-weight: bold;
            margin: ${isRtl ? '5px 7px 15px 15px' : '5px 15px 15px 7px'};
        }
        .sizeGuide-modal #in-rf-table {
            display: none;
        }
        .sizeGuide-modal #cm-sf-table {
            display: table;
        }
${sfHide}        .sizeGuide-modal .heading {
            padding: 35px 0;
            margin: 0;
        }
        .sizeGuide-modal .image img {
            width: 100%;
        }
        /* For dimention switch*/
        .sizeGuide-modal .switch,
        .sizeGuide-modal .switch-sf {
            color: #000000;
            text-align: center;
            ${isRtl ? 'direction: ltr;' : ''}
            float: ${isRtl ? 'left' : 'right'};
            position: relative;
            height: 26px;
            width: 90px;
            background: #ffffff;
            border-radius: 3px;
            border: 1px solid #ecedeb;
            margin: ${isRtl ? '-5px 0px 20px 15px' : '-5px 15px 20px 0px'};
        }
        .sizeGuide-modal .switch-label,
        .sizeGuide-modal .switch-label-sf {
            position: relative;
            z-index: 2;
            float: left;
            width: 38px;
            line-height: 26px;
            font-size: 11px !important;
            color: #ffffff;
            text-align: center;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45);
            cursor: pointer;
            text-shadow: none;
            padding: 0 0 0 2px;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .sizeGuide-modal .switch-label:active,
        .switch-label-sf:active {
            font-weight: bold;
        }
        .sizeGuide-modal .switch-label-off,
        .sizeGuide-modal .switch-label-off-sf {
            color: #000000;
            margin: 0 0 0 5px;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .modal-content .modal-body .sizeGuide-modal .switch-label-off,
        .modal-content .modal-body .switch-label-off-sf {
            padding-left: 0px;
            color: #000000;
            margin: 0 0 0 5px;
        }
        .modal-content .modal-body .sizeGuide-modal .switch-label-on,
        .modal-content .modal-body .switch-label-on-sf {
            color: #ffffff;
            padding: 0 3px 0 5px;
            text-shadow: none;
        }
        .sizeGuide-modal .switch-input,
        .switch-input-sf {
            display: none;
        }
        .sizeGuide-modal .switch-input:checked+.switch-label,
        .switch-input-sf:checked+.switch-label-sf {
            font-weight: bold;
            text-shadow: none !important;
            -webkit-transition: 0.15s ease-out;
            -moz-transition: 0.15s ease-out;
            -ms-transition: 0.15s ease-out;
            -o-transition: 0.15s ease-out;
            transition: 0.15s ease-out;
            -webkit-transition-property: color, text-shadow;
            -moz-transition-property: color, text-shadow;
            -ms-transition-property: color, text-shadow;
            -o-transition-property: color, text-shadow;
            transition-property: color, text-shadow;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .switch-input:checked+.switch-label-off~.switch-selection,
        .switch-input-sf:checked+.switch-label-off-sf~.switch-selection-sf {
            left: 45px;
        }
        .toggleSelected {
            left: 45px;
        }
        .sizeGuide-modal .switch-selection,
        .switch-selection-sf {
            width: 45px;
            position: absolute;
            z-index: 1;
            display: block;
            height: 24px;
            border-radius: 3px;
            background-color: #65bd63;
            background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0%, #9dd993), color-stop(100%, #65bd63));
            background-image: -webkit-linear-gradient(top, #9dd993, #65bd63);
            background-image: -moz-linear-gradient(top, #9dd993, #65bd63);
            background-image: -ms-linear-gradient(top, #9dd993, #65bd63);
            background-image: -o-linear-gradient(top, #9dd993, #65bd63);
            background-image: linear-gradient(top, #9dd993, #65bd63);
            -webkit-box-shadow: inset 0 1px rgba(255, 255, 255, 0.5), 0 0 2px rgba(0, 0, 0, 0.2);
            box-shadow: inset 0 1px rgba(255, 255, 255, 0.5), 0 0 2px rgba(0, 0, 0, 0.2);
            -webkit-transition: left 0.15s ease-out;
            -moz-transition: left 0.15s ease-out;
            -ms-transition: left 0.15s ease-out;
            -o-transition: left 0.15s ease-out;
            transition: left 0.15s ease-out;
        }
        .sizeGuide-modal .switch-blue .switch-selection,
        .sizeGuide-modal .switch-blue-sf .switch-selection-sf {
            background-color: #303ab2;
            background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0%, #303ab2), color-stop(100%, #3aa2d0));
            background-image: -webkit-linear-gradient(top, #303ab2, #303ab2);
            background-image: -moz-linear-gradient(top, #303ab2, #303ab2);
            background-image: -ms-linear-gradient(top, #303ab2, #303ab2);
            background-image: -o-linear-gradient(top, #303ab2, #303ab2);
            background-image: linear-gradient(top, #303ab2, #303ab2);
        }
        .sizeGuide-modal .head .onlyCmBlock {
            display: inline-block;
            float: ${isRtl ? 'left' : 'right'};
            vertical-align: top
        }
        .sizeGuide-modal .head .onlyCm {
            width: 98px;
            border-radius: 3px;
            border: solid 1px #ecedeb;
            background-color: #fbfbfb;
            font-size: 12px;
            font-weight: normal;
            font-style: normal;
            font-stretch: normal;
            line-height: normal;
            letter-spacing: normal;
            text-align: center;
            margin: ${isRtl ? '-10px 0 20px 15px' : '-10px 15px 20px 0'};
            padding: 10px 0;
            color: #303ab2;
        }
        .sizeGuide-modal .footerDetails .infoDetail {
            font-size: 14px;
            font-weight: normal;
            font-style: normal;
            font-stretch: normal;
            line-height: 1;
            letter-spacing: normal;
            color: #5d5e5c;
        }
        .sizeGuide-modal .tabel {
            border-right: 0 !important;
            border-bottom: 0 !important;
        }
        .sizeGuide-modal table tr,
        th {
            border-bottom: 1px solid #ecedeb;
        }
                .black {
            color: #000000;
            font-weight: 600;
        }
        @media only screen and (min-width: 768px) {
            .tables {
                display: flex;
                justify-content: space-between;
            }
            .sizeGuide-modal .image {
                margin-top: 0px;
            }
            .sizeGuide-modal .tabel {
                width: 100%;
                float: ${isRtl ? 'left' : 'right'};
                border: 1px solid #ecedeb;
                margin-top: 0;
            }
            .sizeGuide-modal .tabel {
                margin-bottom: 55px;
            }
            .sizeGuide-modal .measurement {
                width: 100%;
                float: ${isRtl ? 'right' : 'left'};
                color: #929391;
                ${isRtl ? 'margin-right: 0px !important;' : 'margin-left: 0px !important;'}
                ${isRtl ? 'padding-right: 20px;' : 'padding-left: 20px;'}
                font-size: 18px;
            }
            .sizeGuide-modal .measurement ul {
                ${isRtl ? 'padding-right: 20px;' : 'padding-left: 20px;'}
                font-size: 14px;
            }
            .sizeGuide-modal .measurement ul li {
                padding-bottom: 10px;
            }
            .sizeGuide-modal .measurement .title {
                margin: 0 !important;
                color: #000000;
            }
            .sizeGuide-modal table {
                margin: 0 !important;
                width: 100% !important;
            }
            .sizeGuide-modal table,
            td,
            th {
            /*    border: none !important; */
            }
            .sizeGuide-modal td {
                border-right: 1px solid #ecedeb !important;
            }
            .sizeGuide-modal td:last-child {
                /* border-right: 0 !important; */
            }
            .sizeGuide-modal .head {
                padding: 15px 0px 15px 0px;
            }
            .sizeGuide-modal .break {
                display: none;
            }
            .sizeGuide-modal .image img {
                width: 100%;
                height: 100%;
            }
            .sizeGuide-modal .switch-label {
                width: 38px;
            }
            .sizeGuide-modal .switch-selection {
                height: 24px;
            }
            .visible-xs {
                display: none !important;
            }
        }
        @media only screen and (max-width:767px) {
            .hidden-xs {
                display: none !important;
            }
            .sizeGuide-modal body {
                margin: 0;
            }
            .sizeGuide-modal .switch-selection {
                height: 26px;
            }
            .sizeGuide-modal .head {
                margin: 0px 10px;
            }
            .sizeGuide-modal table {
                margin: 0px 0 18px 0;
                height: auto;
                font-family: "Proxima Nova";
                width: 100%;
                font-size: 14px;
            }
            .sizeGuide-modal .measurement {
                margin: 10px 15px;
                width: 95%;
                overflow: auto;
            }
            .sizeGuide-modal thead tr td {
                font-family: "Proxima Nova bold";
            }
            .sizeGuide-modal .tableBlock {
                width: 100%;
                overflow-x: scroll;
            }
            .sizeGuide-modal table td {
                min-width: 100%;
                padding: 0;
                white-space: nowrap;
                height: 50px;
            }
            .sizeGuide-modal .heading {
                display: none;
            }
            .sizeGuide-modal .rightBlock {
                width: 100%;
                order: 1;
            }
            .sizeGuide-modal .leftBlock {
                width: 100%;
                order: 2;
            }
            .sizeGuide-modal {
                display: flex;
                flex-flow: column;
                width: 100%;
                height: 100%;
            }
            .sizeGuide-modal .measurement ul {
                ${isRtl ? 'padding-right: 20px;' : 'padding-left: 20px;'}
                font-size: 14px;
            }
            .sizeGuide-modal .measurement ul li {
                padding-bottom: 10px;
            }
            .sizeGuide-modal footer {
                order: 3;
            }
            .sizeGuide-modal .title {
                ${isRtl ? 'margin-right: 0 !important;' : 'margin-left: 0 !important;'}
                padding: 10px 0;
                margin-bottom: 7px;
                display: inline-block;
            }
            .sizeGuide-modal .switch,
            .sizeGuide-modal .switch-sf {
                margin: ${isRtl ? '5px 0 12px 10px' : '5px 10px 12px 0'};
            }
            .sizeGuide-modal .image img {
                width: 80%;
                margin: 20px 0;
            }
            .sizeGuide-modal .head .onlyCm {
                margin: 0px 0 20px 0;
            }
        }    `;
}

/**
 * CSS block 2 — table header (th) styles.
 */
export const CSS_BLOCK_2 = `          .sizeGuide-modal table th{
            width: 55px;
            vertical-align: middle;
            text-align: center !important;
            white-space: nowrap;
            font-style: inherit;
          }
          @media only screen and (max-width: 767px){
            .sizeGuide-modal table th {
                min-width: 80px;
                padding: 0;
                white-space: nowrap;
                height: 50px;
            }
          }
          @media only screen and (min-width: 768px){
            .sizeGuide-modal th {
                border-right: 1px solid #ecedeb !important;
            }
          }        `;

/**
 * CSS block 3 — modal dialog width and font overrides.
 */
export const CSS_BLOCK_3 = `            @media only screen and (min-width: 768px){
                #size-guide-modal .modal-dialog {width: 915px;}
                .sizeGuide-modal .measurement{font-size: 15px; color: #000000}
                .sizeGuide-modal .tableBlock{font-size: 15px;}
            }            `;

/**
 * Build CSS block for how-to-meeasure section (matches Python EXTRA_CSS).
 * The typo 'meeasure' is intentional — matches the class name in the HTML.
 */
export function buildHowToMeasureCss(direction: 'ltr' | 'rtl'): string {
  const isRtl = direction === 'rtl';
  const h4BeforeMargin = isRtl
    ? 'margin-right: 0; margin-left: 6px;'
    : 'margin-right: 6px;';

  return `        .how-to-meeasure {
            margin: ${isRtl ? '5px 7px 15px 15px' : '5px 15px 15px 7px'};
            padding: 20px 0 0 0;
            border-top: 1px solid #ecedeb;
            counter-reset: step-counter;
        }
        .how-to-meeasure .section-title {
            font-family: "Proxima Nova Bold";
            font-size: 16px;
            font-weight: 900;
            color: #242428;
            margin-bottom: 16px;
        }
        .how-to-measure-body h4 {
            display: flex;
            align-items: center;
            counter-increment: step-counter;
            margin: 0% auto;
            font-size: 14px;
            font-weight: 700;
            color: #000000;
            padding-bottom: 4px;
            text-transform: capitalize;
        }
        .how-to-measure-body h4:before {
            content: counter(step-counter);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            min-width: 20px;
            border-radius: 50%;
            background-color: #0f172a;
            color: white;
            font-size: 12px;
            font-weight: bold;
            ${h4BeforeMargin}
        }
        .how-to-measure-body p {
            margin: 0;
            padding-bottom: 20px;
            color: #64748b;
            font-size: 12px;
            font-weight: 400;
        }
        @media only screen and (max-width: 767px) {
            .how-to-meeasure {
                order: 2;
            }
        }`;
}

/**
 * Convert visual component structure to Nunjucks template
 */
export function generateNunjucksTemplate(template) {
  const { name, structure } = template;
  const templateName = name.toLowerCase().replace(/\s+/g, '-');

  let html = `{# Generated template: ${name} #}\n`;
  html += `{% extends "layouts/base.njk" %}\n\n`;
  html += `{% block content %}\n`;
  html += `<div class="template-${templateName}" data-template="${templateName}">\n`;

  if (structure.components && Array.isArray(structure.components)) {
    structure.components.forEach(component => {
      html += generateComponentHTML(component, 1);
    });
  }

  html += `</div>\n`;
  html += `{% endblock %}\n`;

  return html;
}

/**
 * Generate HTML for a single component
 */
function generateComponentHTML(component, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel);
  let html = '';

  const styles = generateInlineStyles(component);
  const dataAttrs = generateDataAttributes(component);

  if (component.isEditable && component.cmsRegion) {
    html += `${indent}<div ${dataAttrs} ${styles}>\n`;
    html += `${indent}  {{ content.${component.cmsRegion.name} }}\n`;
    html += `${indent}</div>\n`;
  } else if (component.isRepeating && component.cmsRegion) {
    html += `${indent}<div ${dataAttrs} data-cms-type="repeater" ${styles}>\n`;
    html += `${indent}  {% for item in content.${component.cmsRegion.name} %}\n`;
    html += `${indent}    <div class="repeater-item">\n`;

    if (component.children && Array.isArray(component.children)) {
      component.children.forEach(child => {
        html += generateComponentHTML(child, indentLevel + 3);
      });
    }

    html += `${indent}    </div>\n`;
    html += `${indent}  {% endfor %}\n`;
    html += `${indent}</div>\n`;
  } else if (component.isContainer) {
    html += `${indent}<div class="container-${component.type}" ${styles}>\n`;

    if (component.children && Array.isArray(component.children)) {
      component.children.forEach(child => {
        html += generateComponentHTML(child, indentLevel + 1);
      });
    }

    html += `${indent}</div>\n`;
  } else {
    // Static component
    html += `${indent}<div class="component-${component.type}" data-component-id="${component.id}" ${styles}>\n`;
    html += generateComponentContent(component, indentLevel + 1);
    html += `${indent}</div>\n`;
  }

  return html;
}

/**
 * Generate inline styles from component size/position
 */
function generateInlineStyles(component) {
  const styles = [];

  if (component.size) {
    if (component.size.width) {
      styles.push(`width: ${component.size.width}`);
    }
    if (component.size.height) {
      styles.push(`height: ${component.size.height}`);
    }
  }

  if (component.position) {
    if (component.position.x) {
      styles.push(`margin-left: ${component.position.x}`);
    }
    if (component.position.y) {
      styles.push(`margin-top: ${component.position.y}`);
    }
  }

  if (styles.length === 0) return '';
  return `style="${styles.join('; ')}"`;
}

/**
 * Generate data attributes for CMS regions
 */
function generateDataAttributes(component) {
  const attrs = [];
  attrs.push(`data-component-id="${component.id}"`);
  attrs.push(`data-component-type="${component.type}"`);

  if (component.isEditable && component.cmsRegion) {
    attrs.push(`data-cms-region="${component.cmsRegion.name}"`);
    attrs.push(`data-cms-type="${component.cmsRegion.type}"`);
    if (component.cmsRegion.label) {
      attrs.push(`data-cms-label="${component.cmsRegion.label}"`);
    }
  }

  return attrs.join(' ');
}

/**
 * Generate component-specific content
 */
function generateComponentContent(component, indentLevel) {
  const indent = '  '.repeat(indentLevel);
  let html = '';

  switch (component.type) {
    case 'hero':
      html += `${indent}<section class="hero">\n`;
      if (component.props.backgroundImage) {
        html += `${indent}  <img src="${component.props.backgroundImage}" alt="Hero background" class="hero-bg">\n`;
      }
      html += `${indent}  <div class="hero-content">\n`;
      html += `${indent}    <h1>${component.props.title || 'Welcome'}</h1>\n`;
      html += `${indent}    <p>${component.props.subtitle || ''}</p>\n`;
      html += `${indent}  </div>\n`;
      html += `${indent}</section>\n`;
      break;

    case 'textBlock':
      html += `${indent}<p style="font-size: ${component.props.fontSize}; color: ${component.props.color};">\n`;
      html += `${indent}  ${component.props.text || 'Text block'}\n`;
      html += `${indent}</p>\n`;
      break;

    case 'imageBlock':
      html += `${indent}<img src="${component.props.src}" alt="${component.props.alt || 'Image'}" style="width: ${component.props.width};">\n`;
      break;

    case 'button':
      html += `${indent}<a href="${component.props.link || '#'}" class="btn" style="background-color: ${component.props.color};">\n`;
      html += `${indent}  ${component.props.text || 'Click Me'}\n`;
      html += `${indent}</a>\n`;
      break;

    case 'card':
      html += `${indent}<div class="card">\n`;
      if (component.props.image) {
        html += `${indent}  <img src="${component.props.image}" alt="Card image" class="card-image">\n`;
      }
      html += `${indent}  <div class="card-content">\n`;
      html += `${indent}    <h3>${component.props.title || 'Card Title'}</h3>\n`;
      html += `${indent}    <p>${component.props.description || ''}</p>\n`;
      html += `${indent}  </div>\n`;
      html += `${indent}</div>\n`;
      break;

    default:
      html += `${indent}<!-- Component: ${component.type} -->\n`;
  }

  return html;
}

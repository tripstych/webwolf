/**
 * Extension Registry
 * Manages extension registration and lifecycle
 */

class ExtensionRegistry {
  constructor() {
    this.extensions = new Map();
    this.hooks = new Map();
  }

  /**
   * Register an extension
   * @param {string} extensionName - Name of the extension
   * @param {object} definition - Extension definition with fields, validators, hooks, etc.
   */
  register(extensionName, definition) {
    if (this.extensions.has(extensionName)) {
      throw new Error(`Extension "${extensionName}" already registered`);
    }

    // Validate definition structure
    if (!definition.name || !definition.label) {
      throw new Error('Extension must have name and label');
    }

    this.extensions.set(extensionName, definition);

    // Register hooks if provided
    if (definition.hooks) {
      for (const [hookName, handler] of Object.entries(definition.hooks)) {
        this.registerHook(extensionName, hookName, handler);
      }
    }

    console.log(`✅ Extension registered: ${extensionName}`);
  }

  /**
   * Get a registered extension
   * @param {string} extensionName
   * @returns {object} Extension definition
   */
  getExtension(extensionName) {
    if (!this.extensions.has(extensionName)) {
      return null;
    }
    return this.extensions.get(extensionName);
  }

  /**
   * Get all registered extensions
   * @returns {Map} All extensions
   */
  getAllExtensions() {
    return new Map(this.extensions);
  }

  /**
   * Register a hook handler
   * @param {string} extensionName
   * @param {string} hookName - e.g., 'before_save', 'after_create'
   * @param {function} handler
   */
  registerHook(extensionName, hookName, handler) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push({
      extension: extensionName,
      handler
    });
  }

  /**
   * Execute hooks for a given hook name
   * @param {string} hookName
   * @param {object} data - Data to pass to handlers
   * @param {object} context - Additional context
   */
  async executeHooks(hookName, data, context = {}) {
    if (!this.hooks.has(hookName)) {
      return data;
    }

    let modifiedData = data;
    for (const { extension, handler } of this.hooks.get(hookName)) {
      try {
        modifiedData = await handler(modifiedData, context);
      } catch (err) {
        console.error(`Hook error in extension "${extension}" (${hookName}):`, err);
        throw err;
      }
    }
    return modifiedData;
  }

  /**
   * Get fields defined by extensions for a content type
   * @param {string} contentTypeName
   * @param {array} enabledExtensions - Extensions enabled for this content type
   * @returns {object} Field definitions
   */
  getExtensionFields(contentTypeName, enabledExtensions = []) {
    const fields = {};

    for (const extensionName of enabledExtensions) {
      const ext = this.getExtension(extensionName);
      if (ext && ext.fields) {
        Object.assign(fields, ext.fields);
      }
    }

    return fields;
  }

  /**
   * Get validators from extensions
   * @param {string} contentTypeName
   * @param {array} enabledExtensions
   * @returns {array} Validator functions
   */
  getExtensionValidators(contentTypeName, enabledExtensions = []) {
    const validators = [];

    for (const extensionName of enabledExtensions) {
      const ext = this.getExtension(extensionName);
      if (ext && ext.validators) {
        validators.push(...ext.validators);
      }
    }

    return validators;
  }
}

// Create singleton instance
const registry = new ExtensionRegistry();

export default registry;

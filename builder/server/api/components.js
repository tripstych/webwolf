import { Router } from 'express';

const router = Router();

// Component library definitions
const COMPONENT_LIBRARY = {
  hero: {
    type: 'hero',
    label: 'Hero Section',
    icon: 'Image',
    defaultProps: {
      title: 'Welcome to Our Site',
      subtitle: 'Amazing things happen here',
      backgroundImage: '',
      height: '600px'
    },
    editableFields: ['title', 'subtitle', 'backgroundImage']
  },

  textBlock: {
    type: 'textBlock',
    label: 'Text Block',
    icon: 'Type',
    defaultProps: {
      text: 'Enter your text here',
      fontSize: '1rem',
      color: '#000000'
    },
    editableFields: ['text']
  },

  imageBlock: {
    type: 'imageBlock',
    label: 'Image',
    icon: 'Image',
    defaultProps: {
      src: '',
      alt: 'Image',
      width: '100%'
    },
    editableFields: ['src', 'alt']
  },

  cardGrid: {
    type: 'cardGrid',
    label: 'Card Grid',
    icon: 'Grid',
    defaultProps: {
      columns: 3,
      gap: '20px'
    },
    isContainer: true,
    editableFields: []
  },

  card: {
    type: 'card',
    label: 'Card',
    icon: 'Square',
    defaultProps: {
      title: 'Card Title',
      description: 'Card description',
      image: ''
    },
    editableFields: ['title', 'description', 'image']
  },

  button: {
    type: 'button',
    label: 'Button',
    icon: 'MousePointer',
    defaultProps: {
      text: 'Click Me',
      link: '#',
      color: '#007bff'
    },
    editableFields: ['text', 'link']
  }
};

// Get all component definitions
router.get('/', (req, res) => {
  res.json(COMPONENT_LIBRARY);
});

// Get single component definition
router.get('/:type', (req, res) => {
  const component = COMPONENT_LIBRARY[req.params.type];
  if (!component) {
    return res.status(404).json({ error: 'Component type not found' });
  }
  res.json(component);
});

export default router;

import { COMPONENT_LIBRARY } from '../lib/componentDefinitions';

export default function ComponentRenderer({ component }) {
  if (!component) return null;

  const definition = COMPONENT_LIBRARY[component.type];
  if (!definition) {
    return <div className="bg-red-100 p-4 rounded text-red-700">Unknown component: {component.type}</div>;
  }

  const styles = {
    width: component.size?.width || 'auto',
    height: component.size?.height || 'auto',
    marginLeft: component.position?.x || 0,
    marginTop: component.position?.y || 0
  };

  const props = component.props || definition.defaultProps;

  return (
    <div
      data-component-id={component.id}
      data-component-type={component.type}
      style={styles}
      className="bg-gray-50 border border-gray-300 rounded p-4"
    >
      {component.type === 'hero' && (
        <section className="hero bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded">
          {props.backgroundImage && (
            <img src={props.backgroundImage} alt="Hero background" className="w-full h-full object-cover rounded" />
          )}
          <div className="hero-content p-8">
            <h1 className="text-4xl font-bold mb-2">{props.title}</h1>
            <p className="text-xl">{props.subtitle}</p>
          </div>
        </section>
      )}

      {component.type === 'textBlock' && (
        <p style={{ fontSize: props.fontSize, color: props.color }} className="text-gray-700">
          {props.text}
        </p>
      )}

      {component.type === 'imageBlock' && (
        <div className="image-block">
          {props.src ? (
            <img src={props.src} alt={props.alt} style={{ width: props.width }} className="rounded" />
          ) : (
            <div className="bg-gray-200 w-full h-48 rounded flex items-center justify-center text-gray-500">
              No image
            </div>
          )}
        </div>
      )}

      {component.type === 'card' && (
        <div className="card bg-white border border-gray-200 rounded-lg overflow-hidden">
          {props.image && (
            <img src={props.image} alt="Card image" className="w-full h-40 object-cover" />
          )}
          <div className="card-content p-4">
            <h3 className="text-lg font-semibold text-gray-800">{props.title}</h3>
            <p className="text-gray-600 mt-2">{props.description}</p>
          </div>
        </div>
      )}

      {component.type === 'button' && (
        <a
          href={props.link || '#'}
          style={{ backgroundColor: props.color }}
          className="inline-block px-6 py-2 text-white rounded font-medium hover:opacity-90 transition"
        >
          {props.text}
        </a>
      )}

      {component.type === 'cardGrid' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.columns}, 1fr)`, gap: props.gap }}>
          <div className="bg-white border border-gray-200 rounded p-4 text-center text-gray-500">
            Card Grid
          </div>
          <div className="bg-white border border-gray-200 rounded p-4 text-center text-gray-500">
            Add cards
          </div>
          <div className="bg-white border border-gray-200 rounded p-4 text-center text-gray-500">
            Preview
          </div>
        </div>
      )}
    </div>
  );
}

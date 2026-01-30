import { query } from '../db/connection.js';

export async function getMenuBySlug(slug) {
  try {
    const [menu] = await query('SELECT * FROM menus WHERE slug = ?', [slug]);
    if (!menu) return null;

    const items = await query(`
      SELECT mi.*, p.title as page_title, p.slug as page_slug
      FROM menu_items mi
      LEFT JOIN pages p ON mi.page_id = p.id
      WHERE mi.menu_id = ?
      ORDER BY mi.position
    `, [menu.id]);

    // Build nested tree
    const itemMap = {};
    const rootItems = [];

    items.forEach(item => {
      const url = item.page_id ? `/${item.page_slug}` : item.url;
      itemMap[item.id] = { 
        id: item.id,
        title: item.title, 
        url, 
        target: item.target,
        children: [] 
      };
    });

    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        rootItems.push(itemMap[item.id]);
      }
    });

    return { ...menu, items: rootItems };
  } catch (err) {
    console.error('Error fetching menu:', err);
    return null;
  }
}

export async function getAllMenus() {
  try {
    const menus = await query('SELECT slug FROM menus');
    const result = {};
    
    for (const menu of menus) {
      result[menu.slug] = await getMenuBySlug(menu.slug);
    }
    
    return result;
  } catch (err) {
    console.error('Error fetching menus:', err);
    return {};
  }
}

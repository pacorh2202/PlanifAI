
const databaseId = '2ff084e0-54b2-80fe-9c0c-c2da28622367';
const secret = 'ntn_P22292942586pQHNSvX0BGf3Er76rpQTYXeAT2X1sOLaqk';

async function fetchTickets() {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${secret}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    const tickets = data.results.map(item => {
        const props = item.properties;
        return {
            id: item.id,
            title: props['Título']?.title?.[0]?.plain_text || 'No Title',
            status: props['Estado']?.status?.name || 'No Status',
            severity: props['Severidad']?.select?.name || 'Normal',
            description: props['Descripción']?.rich_text?.map(t => t.plain_text).join('') || 'No Description',
            assigned: props['Persona asignada']?.people?.[0]?.name || 'Unassigned'
        };
    });

    console.log(JSON.stringify(tickets, null, 2));
}

fetchTickets().catch(console.error);

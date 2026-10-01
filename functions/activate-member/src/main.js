import { Client, TablesDB, Users, Teams, ID, Query, Permission, Role } from 'node-appwrite';

const DB = process.env.APP_DB_ID || 'badai_prompt_umkm';
const ORDERS = process.env.ORDERS_TABLE_ID || 'orders';
const PROFILES = process.env.PROFILES_TABLE_ID || 'member_profiles';
const TEAM_ID = process.env.PAID_TEAM_ID || 'paid-members';

const unpack = (row) => ({ ...(row?.data || row || {}), $id: row?.$id || row?.data?.$id });

export default async ({ req, res, log, error }) => {
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers['x-appwrite-key']);

    const tables = new TablesDB(client);
    const users = new Users(client);
    const teams = new Teams(client);

    const order = unpack(req.bodyJson || {});
    if (!order.$id || order.status !== 'success' || order.access_issued === true) {
      return res.json({ ok: true, skipped: true });
    }

    const email = String(order.email || '').trim().toLowerCase();
    if (!email) throw new Error('Order email kosong');

    const found = await users.list({ queries: [Query.equal('email', email), Query.limit(1)] });
    let user = (found.users || [])[0] || null;

    if (!user) {
      user = await users.create({
        userId: ID.unique(),
        email,
        name: String(order.full_name || 'Member BADAI PROMPT UMKM').slice(0, 128)
      });
    }

    try {
      await teams.createMembership({
        teamId: TEAM_ID,
        roles: ['member'],
        userId: user.$id
      });
    } catch (e) {
      if (Number(e?.code) !== 409) throw e;
    }

    const profile = {
      user_id: user.$id,
      name: String(order.full_name || ''),
      email,
      whatsapp: String(order.whatsapp || ''),
      status: 'active',
      role: 'member'
    };

    try {
      await tables.createRow({
        databaseId: DB,
        tableId: PROFILES,
        rowId: user.$id,
        data: profile,
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id))
        ]
      });
    } catch (e) {
      if (Number(e?.code) === 409) {
        await tables.updateRow({ databaseId: DB, tableId: PROFILES, rowId: user.$id, data: profile });
      } else {
        throw e;
      }
    }

    await tables.updateRow({
      databaseId: DB,
      tableId: ORDERS,
      rowId: order.$id,
      data: { user_id: user.$id, access_issued: true }
    });

    log?.('Activated paid member ' + user.$id);
    return res.json({ ok: true, user_id: user.$id });
  } catch (e) {
    error?.(e?.stack || String(e));
    return res.json({ ok: false, error: String(e?.message || e) }, 500);
  }
};

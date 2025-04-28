import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET() {
  try {
    const { rows } = await pool.query(
      'SELECT name, score FROM player_score ORDER BY score DESC LIMIT 5'
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('获取最高分失败:', err);
    return NextResponse.json(
      { error: '获取最高分失败' },
      { status: 500 }
    );
  }
}

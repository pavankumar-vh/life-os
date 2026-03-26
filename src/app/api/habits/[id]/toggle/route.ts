import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Habit } from '@/models/Habit'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_HABITS } from '@/lib/demo-data'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { date } = await req.json()

  if (isDemoUser(payload.userId)) {
    const habit = DEMO_HABITS.find((h) => h._id === id)
    if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const idx = habit.completedDates.indexOf(date)
    if (idx >= 0) habit.completedDates.splice(idx, 1)
    else habit.completedDates.push(date)
    return NextResponse.json(habit)
  }

  await connectDB()
  const habit = await Habit.findOne({ _id: id, userId: payload.userId })
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const idx = habit.completedDates.indexOf(date)
  if (idx >= 0) {
    habit.completedDates.splice(idx, 1)
  } else {
    habit.completedDates.push(date)
    // Award XP
    await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 10 } })
  }

  // Calculate streak
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (habit.completedDates.includes(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  habit.streak = streak
  if (streak > habit.bestStreak) habit.bestStreak = streak

  await habit.save()
  return NextResponse.json(habit)
  } catch (e) {
    console.error('PATCH /api/habits/[id]/toggle error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

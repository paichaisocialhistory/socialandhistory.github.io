'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';
import { getFeatures } from '@/lib/features';
import { parseVideoSource } from '@/lib/video-source';
import { parseTimestamp } from '@/lib/format';

export async function createVideo(formData: FormData): Promise<ActionState> {
  if (!getFeatures().videos) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 영상을 등록할 수 있습니다.');

  const sourceUrl = text(formData, 'source_url');
  if (!sourceUrl) return fail('영상 링크를 입력하세요.');

  const source = parseVideoSource(sourceUrl);
  if (!source) {
    return fail(
      'YouTube 또는 학교 구글 드라이브 링크만 등록할 수 있습니다. 주소를 다시 확인하세요.',
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('videos').insert({
    title: text(formData, 'title'),
    source_url: sourceUrl,
    match_id: text(formData, 'match_id'),
    team_id: text(formData, 'team_id'),
  });

  if (error) return fail(describeError(error));

  revalidatePath('/videos');
  return ok('영상을 등록했습니다.');
}

export async function deleteVideo(formData: FormData): Promise<ActionState> {
  if (!getFeatures().videos) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 영상을 삭제할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('영상을 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) return fail(describeError(error));

  revalidatePath('/videos');
  return ok('영상을 삭제했습니다.');
}

/** 재생 중 특정 시점에 남기는 분석 메모. 로그인한 교사 누구나 남길 수 있다. */
export async function addAnnotation(formData: FormData): Promise<ActionState> {
  if (!getFeatures().videos) return fail('사용할 수 없는 기능입니다.');

  const user = await getCurrentUser();
  if (!user) return fail('교사 계정으로 로그인해야 메모를 남길 수 있습니다.');

  const videoId = text(formData, 'video_id');
  if (!videoId) return fail('영상을 찾을 수 없습니다.');

  const rawTimestamp = text(formData, 'timestamp');
  const seconds = rawTimestamp === null ? null : parseTimestamp(rawTimestamp);
  if (seconds === null) return fail('시점을 "1:23" 또는 초 단위 숫자로 입력하세요.');

  const note = text(formData, 'note');
  if (!note) return fail('메모 내용을 입력하세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('video_annotations').insert({
    video_id: videoId,
    timestamp_seconds: seconds,
    player_id: text(formData, 'player_id'),
    note,
    created_by: user.email ?? user.id,
  });

  if (error) return fail(describeError(error));

  revalidatePath(`/videos/${videoId}`);
  revalidatePath('/players');
  return ok('분석 메모를 저장했습니다.');
}

export async function deleteAnnotation(formData: FormData): Promise<ActionState> {
  if (!getFeatures().videos) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 메모를 삭제할 수 있습니다.');

  const id = text(formData, 'id');
  const videoId = text(formData, 'video_id');
  if (!id) return fail('메모를 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('video_annotations').delete().eq('id', id);
  if (error) return fail(describeError(error));

  if (videoId) revalidatePath(`/videos/${videoId}`);
  return ok('메모를 삭제했습니다.');
}

import type {JournalRepository} from './model';

export class RemoveJournal {
  constructor(private readonly repository: JournalRepository) {}

  async remove(id: string): Promise<void> {
    if (!await this.repository.delete(id)) throw new Error('지울 기록을 찾지 못했어요. 목록을 다시 불러와 주세요.');
  }
}

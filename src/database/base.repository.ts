// src/common/repositories/base.repository.ts
import { DeepPartial, Repository } from 'typeorm';

export class BaseRepository<
  T,
  CreateDto extends DeepPartial<T>,
  UpdateDto extends DeepPartial<T> = DeepPartial<T>,
> {
  constructor(protected readonly repo: Repository<T>) {}

  async findAll() {
    return this.repo.find();
  }

  async findOne(
    id: string,
    options?: {
      relations?: string[];
    },
  ): Promise<T | null> {
    return this.repo.findOne({
      where: { id } as any,
      relations: options?.relations,
    });
  }

  async create(createDto: CreateDto): Promise<T> {
    const entity = this.repo.create(createDto);
    return this.repo.save(entity);
  }

  async save(entity: T): Promise<T> {
    return this.repo.save(entity);
  }

  async createNosave(createDto: CreateDto): Promise<T> {
    return this.repo.create(createDto);
  }

  async update(id: string, updateDto: UpdateDto): Promise<T> {
    const entity = await this.findOne(id);
    if (!entity) throw new Error(`Entity with id ${id} not found`);
    Object.assign(entity, updateDto);
    return this.repo.save(entity);
  }

  async delete(id: string) {
    return this.repo.delete(id);
  }
}

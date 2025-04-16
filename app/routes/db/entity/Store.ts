import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  store_name!: string;

  @Column({ nullable: true })
  preferred_color!: string;
}

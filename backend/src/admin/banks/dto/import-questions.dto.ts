import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';

class QuestionItem {
  @IsInt()
  orderNo: number;

  @IsString()
  @IsIn(['SINGLE', 'MULTIPLE', 'JUDGE', 'SHORT'])
  type: string;

  @IsString()
  stem: string;

  @IsString()
  answerRaw: string;

  answerJson: any;

  @IsArray()
  options: { label: string; content: string; orderNo: number }[];
}

export class ImportQuestionsDto {
  @IsInt()
  bookId: number;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionItem)
  questions: QuestionItem[];
}

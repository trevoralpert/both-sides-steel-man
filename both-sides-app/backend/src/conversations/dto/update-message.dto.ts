import { IsString, IsOptional, IsNotEmpty, MaxLength, IsJSON } from 'class-validator';
import { FormattingOptions, Attachment } from './create-message.dto';

export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsJSON()
  metadata?: {
    formatting?: FormattingOptions;
    attachments?: Attachment[];
    editReason?: string;
  };
}

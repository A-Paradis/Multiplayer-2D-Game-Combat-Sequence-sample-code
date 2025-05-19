import { MapsController } from '@app/controllers/maps/maps.controller';
import { Map, mapSchema } from '@app/model/database/map.schema';
import { MapsService } from '@app/services/maps/maps.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [MongooseModule.forFeature([{ name: Map.name, schema: mapSchema }])],
    controllers: [MapsController],
    providers: [MapsService],
    exports: [MapsService],
})
export class MapsModule {}

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TestStepInput(BaseModel):
    step_type: Optional[str] = None
    step_number: int
    step_name: Optional[str] = None
    value: Optional[str] = None
    spec_min: Optional[str] = None
    spec_max: Optional[str] = None
    result: str

class PCBResultInput(BaseModel):
    channel_id: int
    model_id: int
    pid: str
    fid: Optional[str] = None
    pcba_partno: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    test_time: Optional[float] = None
    result: str
    file_path: str
    jobfile: str
    steps: List[TestStepInput] = []

class SystemLogInput(BaseModel):
    level: str
    message: str
    line_id: Optional[int] = 0
    station_id: Optional[int] = 0
    channel_id: Optional[int] = 0
    device_id: Optional[int] = 0

# --- Master Data Schemas ---

class BuyerBase(BaseModel):
    name: str
    remark: Optional[str] = ""

class BuyerModel(BuyerBase):
    id: int

class LineBase(BaseModel):
    name: str
    remark: Optional[str] = ""

class LineModel(LineBase):
    id: int

class StationTypeBase(BaseModel):
    name: str
    remark: Optional[str] = ""

class StationTypeModel(StationTypeBase):
    id: int

class StationBase(BaseModel):
    line_id: int
    model_group_id: int
    station_type_id: int
    name: str

class StationModel(StationBase):
    id: int

class ModelGroupBase(BaseModel):
    buyer_id: int
    name: str
    remark: Optional[str] = ""

class ModelGroupModel(ModelGroupBase):
    id: int

class ModelInfoBase(BaseModel):
    model_group_id: int
    name: str
    remark: Optional[str] = ""

class ModelInfoModel(ModelInfoBase):
    id: int

class ChannelBase(BaseModel):
    station_id: int
    name: str
    machine_partno: Optional[str] = ""
    ip_address: Optional[str] = ""
    mac_address: Optional[str] = ""
    gmes_name: Optional[str] = ""
    status: Optional[str] = "Running"
    remark: Optional[str] = ""

class ChannelModel(ChannelBase):
    id: int

class DeviceTypeBase(BaseModel):
    name: str
    remark: Optional[str] = ""

class DeviceTypeModel(DeviceTypeBase):
    id: int

class DeviceBase(BaseModel):
    channel_id: int
    device_type_id: int
    name: str
    model_partno: Optional[str] = ""
    serial_number: Optional[str] = ""
    status: Optional[str] = "OK"
    remark: Optional[str] = ""

class DeviceModel(DeviceBase):
    id: int

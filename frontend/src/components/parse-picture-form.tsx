'use client'

import React from 'react'
import {PlatformItems, type PromptOptions, PurposeItems, StyleItems, TextLengthItems, ToneItems} from 'lib/model/form'
import {Checkbox, Select, Textarea} from '@mantine/core'
import {ChevronRightIcon} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import {getPlasmoShadowContainer} from "../../lib/utils";

interface ParsePictureFormProps {
    data: PromptOptions
    // onSubmit: () => void
    onChange: (value: PromptOptions) => void
}

export default function ParsePictureForm({
                                             data,
                                             onChange
                                         }: ParsePictureFormProps) {
    const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false)

    const handleFileChange = (
        value: string | boolean,
        type: keyof PromptOptions
    ) => {
        onChange({...data, [type]: value})
    }

    return (
        <div className="plasmo-space-y-3 plasmo-w-full">
            <div className="plasmo-font-semibold">Settings</div>

            <div className="plasmo-flex plasmo-space-x-2">
                <Select
                    comboboxProps={{
                        withinPortal: true,
                        portalProps: {
                            target: getPlasmoShadowContainer(),
                        }
                    }}
                    variant="filled"
                    className="plasmo-w-1/2"
                    label="Platform"
                    value={data.platform}
                    data={PlatformItems}
                    onChange={v => handleFileChange(v || '', 'platform')}
                />
                <Select
                    className="plasmo-w-1/2"
                    label={'Tone'}
                    value={data.tone}
                    data={Object.keys(ToneItems)}
                    onChange={v => handleFileChange(v || '', 'tone')}
                />
            </div>

            <div className="plasmo-space-y-3">
                <div
                    className="plasmo-text-md plasmo-font-semibold plasmo-inline-flex plasmo-items-center plasmo-cursor-pointer "
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    <span className="">Advanced Setting</span>
                    <ChevronRightIcon
                        className={clsx(
                            'plasmo-w-4 plasmo-ml-1 plasmo-mt-[2px] plasmo-inline-block plasmo-transition-all plasmo-font-bold',
                            {
                                'plasmo-rotate-90': showAdvanced
                            }
                        )}
                    />
                </div>
                <div className={clsx('plasmo-space-y-3', showAdvanced ? 'plasmo-block' : 'plasmo-hidden')}>
                    <Textarea
                        label={'Topic'}
                        placeholder={'Enter your topic about this picture'}
                        value={data.topic}
                        rows={3}
                        onChange={e => handleFileChange(e.target.value, 'topic')}
                    />

                    <div className={'plasmo-flex plasmo-items-center plasmo-w-full plasmo-space-x-2'}>
                        <Select
                            className="plasmo-w-full"
                            label={'Words'}
                            value={data.textLength}
                            data={TextLengthItems}
                            onChange={v => handleFileChange(v || '', 'textLength')}
                        />
                        <Select
                            className="plasmo-w-full"
                            label={'Style'}
                            value={data.style}
                            data={Object.keys(StyleItems)}
                            onChange={v => handleFileChange(v || '', 'tone')}
                        />
                    </div>
                    <Select
                        label={'Type'}
                        value={data.purpose}
                        data={Object.keys(PurposeItems)}
                        onChange={v => handleFileChange(v || '', 'purpose')}
                    />

                    <Checkbox
                        label={'Include SEO'}
                        checked={data.includeSEO}
                        onChange={e => handleFileChange(e.target.checked, 'includeSEO')}
                    />
                    <Checkbox
                        label={'Include Call To Action'}
                        checked={data.includeCallToAction}
                        onChange={e =>
                            handleFileChange(e.target.checked, 'includeCallToAction')
                        }
                    />
                    <Checkbox
                        label={'Include Hashtags'}
                        checked={data.includeHashtags}
                        onChange={e =>
                            handleFileChange(e.target.checked, 'includeHashtags')
                        }
                    />
                </div>
                {/*<Button fullWidth onClick={() => onSubmit()} disabled={loading} className="hidden">*/}
                {/*  {loading ? (*/}
                {/*    <>*/}
                {/*      <span className="mr-2">Generating</span>*/}
                {/*      <Loader size={14} color={'#fff'} />*/}
                {/*    </>*/}
                {/*  ) : (*/}
                {/*    'Generate Post'*/}
                {/*  )}*/}
                {/*</Button>*/}
            </div>
        </div>
    )
}
